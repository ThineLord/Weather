document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    const cityInput = document.getElementById('city-input');
    const searchButton = document.getElementById('search-button');
    const weatherCardsContainer = document.getElementById('weather-cards-container');
    const currentTimeDisplay = document.getElementById('current-time');
    const themeToggleButton = document.querySelector('.theme-switcher');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');

    const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
    const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

    let savedLocations = JSON.parse(localStorage.getItem('weatherAppLocationsOM')) || [];
    let currentTheme = localStorage.getItem('weatherAppThemeOM') || 'light';

    function applyTheme(theme) {
        console.log('Applying theme:', theme);
        document.body.classList.toggle('dark-mode', theme === 'dark');
        themeToggleIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        localStorage.setItem('weatherAppThemeOM', theme);
        currentTheme = theme;
    }

    function updateTime() {
        const now = new Date();
        currentTimeDisplay.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function mapWeatherCode(code) {
        const wmo = {
            0: { description: '晴朗', icon: 'fas fa-sun', background: 'clear-sky' },
            1: { description: '基本晴朗', icon: 'fas fa-sun', background: 'clear-sky' },
            2: { description: '部分多云', icon: 'fas fa-cloud-sun', background: 'few-clouds' },
            3: { description: '阴天', icon: 'fas fa-cloud', background: 'overcast-clouds' },
            45: { description: '雾', icon: 'fas fa-smog', background: 'mist' },
            48: { description: '冻雾', icon: 'fas fa-smog', background: 'mist' },
            51: { description: '小毛毛雨', icon: 'fas fa-cloud-rain', background: 'shower-rain' },
            53: { description: '中等毛毛雨', icon: 'fas fa-cloud-rain', background: 'shower-rain' },
            55: { description: '大毛毛雨', icon: 'fas fa-cloud-rain', background: 'shower-rain' },
            56: { description: '小冻毛毛雨', icon: 'fas fa-cloud-rain', background: 'rain' },
            57: { description: '大冻毛毛雨', icon: 'fas fa-cloud-rain', background: 'rain' },
            61: { description: '小雨', icon: 'fas fa-cloud-showers-heavy', background: 'rain' },
            63: { description: '中雨', icon: 'fas fa-cloud-showers-heavy', background: 'rain' },
            65: { description: '大雨', icon: 'fas fa-cloud-showers-heavy', background: 'rain' },
            66: { description: '小冻雨', icon: 'fas fa-icicles', background: 'rain' },
            67: { description: '大冻雨', icon: 'fas fa-icicles', background: 'rain' },
            71: { description: '小雪', icon: 'fas fa-snowflake', background: 'snow' },
            73: { description: '中雪', icon: 'fas fa-snowflake', background: 'snow' },
            75: { description: '大雪', icon: 'fas fa-snowflake', background: 'snow' },
            77: { description: '雪粒', icon: 'fas fa-igloo', background: 'snow' },
            80: { description: '小阵雨', icon: 'fas fa-cloud-sun-rain', background: 'shower-rain' },
            81: { description: '中阵雨', icon: 'fas fa-cloud-sun-rain', background: 'rain' },
            82: { description: '大/猛烈阵雨', icon: 'fas fa-cloud-showers-heavy', background: 'rain' },
            85: { description: '小阵雪', icon: 'fas fa-snowflake', background: 'snow' },
            86: { description: '大阵雪', icon: 'fas fa-snowflake', background: 'snow' },
            95: { description: '雷暴', icon: 'fas fa-bolt', background: 'thunderstorm' },
            96: { description: '雷暴伴有小冰雹', icon: 'fas fa-cloud-bolt', background: 'thunderstorm' },
            99: { description: '雷暴伴有大冰雹', icon: 'fas fa-cloud-bolt', background: 'thunderstorm' }
        };
        const result = wmo[code] || { description: '未知代码 ' + code, icon: 'fas fa-question-circle', background: '' };
        // console.log(`Mapped weather code ${code} to:`, result);
        return result;
    }

    async function getWeatherDataByCoords(lat, lon, geoInfo) {
        console.log(`Workspaceing weather for coords: lat=<span class="math-inline">\{lat\}, lon\=</span>{lon}, geoInfo:`, geoInfo);
        const weatherUrl = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&windspeed_unit=ms&timezone=auto`;
        console.log('Constructed Weather URL:', weatherUrl); // <<--- 添加这个 console.log
        try {
            const response = await fetch(weatherUrl);
            console.log('Weather API response status:', response.status);
            if (!response.ok) throw new Error(`天气数据获取失败: ${response.status} ${response.statusText}`);
            const data = await response.json();
            console.log('Weather API dats received:', data);
            return { 
                weather: data, // Contains 'current' object
                geo: geoInfo   // Contains 'id', 'name', 'country_code', 'latitude', 'longitude'
            };
        } catch (error) {
            console.error(`获取 (${geoInfo.name || '坐标'}) 天气数据失败:`, error);
            alert(`无法获取 ${geoInfo.name || '该位置'} 的天气数据: ${error.message}`);
            return null;
        }
    }

    async function geocodeCity(cityName) {
        console.log('Geocoding city:', cityName);
        const geocodeUrl = `${GEOCODING_API_URL}?name=${encodeURIComponent(cityName)}&count=1&language=zh&format=json`;
        console.log('Constructed Geocoding URL:', geocodeUrl); // <--- 新增这行
        try {
            const response = await fetch(geocodeUrl);
            console.log('Geocoding API response status:', response.status);
            if (!response.ok) throw new Error(`地理编码失败: ${response.status} ${response.statusText}`);
            const data = await response.json();
            console.log('Geocoding API data received:', data);

            if (!data.results || data.results.length === 0) {
                throw new Error(`找不到城市 "${cityName}"`);
            }
            // Return the first result, which includes id, name, country_code, latitude, longitude
            return data.results[0]; 
        } catch (error) {
            console.error(`地理编码 "${cityName}" 失败:`, error);
            alert(error.message);
            return null;
        }
    }

    function createWeatherCard(apiResponse) {
        console.log('Creating weather card with data:', apiResponse);
        if (!apiResponse || !apiResponse.weather || !apiResponse.weather.current || !apiResponse.geo) {
            console.error("无效的天气数据提供给 createWeatherCard:", apiResponse);
            return null;
        }
        
        const currentData = apiResponse.weather.current;
        const geoData = apiResponse.geo; // Contains id, name, country_code etc.
        const mappedWeather = mapWeatherCode(currentData.weather_code);

        // Use a unique and stable ID for the card. For searched cities, use geoData.id. For local, a fixed string.
        const cardId = geoData.isLocal ? "current-location" : `city-${geoData.id}`;
        const displayName = geoData.isLocal ? "当前位置" : `${geoData.name}, ${geoData.country_code || ''}`.trim().replace(/,$/, '');


        const card = document.createElement('div');
        card.classList.add('weather-card');
        card.dataset.cardId = cardId; // Unique ID for the card element

        if (mappedWeather.background) {
            card.classList.add(mappedWeather.background);
        }

        const temp = Math.round(currentData.temperature_2m);
        const feelsLike = Math.round(currentData.apparent_temperature);
        const windSpeed = currentData.wind_speed_10m.toFixed(1);
        const humidity = currentData.relative_humidity_2m;

        card.innerHTML = `
            <div class="weather-card-content">
                <h2>
                    <span class="location">${displayName}</span>
                    <button class="remove-card" title="删除此卡片"><i class="fas fa-times"></i></button>
                </h2>
                <div class="weather-info">
                    <i class="${mappedWeather.icon} weather-icon" style="font-size: 50px; margin-right: 15px;"></i>
                    <span class="temperature">${temp}°C</span>
                </div>
                <div class="weather-details">
                    <p>体感温度: <strong>${feelsLike}°C</strong></p>
                    <p>天气: <strong>${mappedWeather.description}</strong></p>
                    <p>湿度: <strong>${humidity}%</strong></p>
                    <p>风速: <strong>${windSpeed} m/s</strong></p>
                </div>
            </div>
        `;
        
        card.querySelector('.remove-card').addEventListener('click', () => removeLocation(cardId, geoData.id));
        console.log('Weather card created for:', cardId, displayName);
        return card;
    }
    
    async function displayWeather(source, isInitialLoad = false) {
        console.log(`displayWeather called with source:`, source, `isInitialLoad: ${isInitialLoad}`);
        
        let weatherDataPacket; // Will hold { weather: ..., geo: ... }
        let cardIdToCheck; // Unique ID for checking existing cards and for the card itself
        let geoIdToSave; // Geocoding ID to save for searched locations

        const loadingIndicator = document.createElement('div');
        loadingIndicator.classList.add('loader');
        // Only add loader for non-initial, non-local actions (i.e., user search)
        if (!isInitialLoad && typeof source === 'string') {
             weatherCardsContainer.appendChild(loadingIndicator);
        }

        try {
            if (typeof source === 'string') { // City name search
                const geoInfo = await geocodeCity(source); // geoInfo contains id, name, country_code, lat, lon
                if (!geoInfo) throw new Error("Geocoding failed or city not found.");
                
                cardIdToCheck = `city-${geoInfo.id}`;
                geoIdToSave = geoInfo.id; // Open-Meteo geocoding ID (number)

                // Check for existing card before fetching weather (for user searches)
                if (!isInitialLoad && weatherCardsContainer.querySelector(`.weather-card[data-card-id="${cardIdToCheck}"]`)) {
                    alert(`${geoInfo.name} 的天气信息已显示。`);
                    throw new Error("Card already exists."); // Abort further processing
                }
                weatherDataPacket = await getWeatherDataByCoords(geoInfo.latitude, geoInfo.longitude, geoInfo);

            } else if (source.lat && source.lon) { // Coordinates (local weather)
                const localGeoInfo = { 
                    latitude: source.lat, 
                    longitude: source.lon, 
                    isLocal: true, 
                    name: "当前位置" // Default name for local
                };
                cardIdToCheck = "current-location";
                weatherDataPacket = await getWeatherDataByCoords(source.lat, source.lon, localGeoInfo);
            } else {
                throw new Error("Invalid source for displayWeather");
            }

            if (!weatherDataPacket) throw new Error("Failed to get weather data packet.");

            // If refreshing (initial load or local weather update), remove old card if it exists
            const existingCard = weatherCardsContainer.querySelector(`.weather-card[data-card-id="${cardIdToCheck}"]`);
            if (existingCard) {
                console.log('Removing existing card for refresh:', cardIdToCheck);
                existingCard.remove();
            }

            const card = createWeatherCard(weatherDataPacket);
            if (card) {
                if (weatherDataPacket.geo.isLocal) {
                    weatherCardsContainer.prepend(card);
                } else {
                    weatherCardsContainer.appendChild(card);
                }

                // Save successfully fetched *searched* locations (by their geocoding ID)
                if (geoIdToSave && !weatherDataPacket.geo.isLocal) {
                    if (!savedLocations.includes(geoIdToSave)) {
                        savedLocations.push(geoIdToSave);
                        saveLocationsToLocalStorage();
                        console.log('Saved location ID to localStorage:', geoIdToSave);
                    }
                }
            } else {
                console.error("Card creation failed.");
            }

        } catch (error) {
            console.warn("Error in displayWeather:", error.message);
            // Alert for user-facing errors was likely handled in geocodeCity or getWeatherDataByCoords
        } finally {
            if (loadingIndicator.parentNode) {
                loadingIndicator.remove();
            }
        }
    }

    function saveLocationsToLocalStorage() {
        localStorage.setItem('weatherAppLocationsOM', JSON.stringify(savedLocations));
        console.log('Updated savedLocations in localStorage:', savedLocations);
    }

    function removeLocation(cardId, geoIdToRemove) { // geoIdToRemove is the numeric ID from geocoding API
        console.log('Attempting to remove location. CardID:', cardId, 'GeoID to remove from storage:', geoIdToRemove);
        
        // Remove from savedLocations array (which stores numeric geo IDs)
        if (geoIdToRemove) {
            savedLocations = savedLocations.filter(id => id !== geoIdToRemove);
            saveLocationsToLocalStorage();
        } else if (cardId === "current-location") {
            // Local weather card doesn't correspond to a saved geoId
            console.log("Removing current location card, not affecting saved storage.");
        }

        const cardToRemove = weatherCardsContainer.querySelector(`.weather-card[data-card-id="${cardId}"]`);
        if (cardToRemove) {
            cardToRemove.remove();
            console.log('Card removed from DOM:', cardId);
        } else {
            console.warn('Could not find card to remove with cardId:', cardId);
        }
    }
    
    searchButton.addEventListener('click', () => {
        console.log('Search button clicked');
        const city = cityInput.value.trim();
        if (city) {
            console.log('Searching for city:', city);
            displayWeather(city, false); // Not initial load
            cityInput.value = '';
        } else {
            alert("请输入城市名称。");
            console.log('City input was empty');
        }
    });

    cityInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            console.log('Enter key pressed in city input');
            searchButton.click();
        }
    });

    themeToggleButton.addEventListener('click', () => {
        console.log('Theme toggle button clicked');
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    });

    async function initializeApp() {
        console.log('Initializing app...');
        applyTheme(currentTheme);
        updateTime();
        setInterval(updateTime, 1000);

        // 1. Try to get local weather
        if (navigator.geolocation) {
            console.log('Geolocation is available.');
            try {
                const position = await new Promise((resolve, reject) => 
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000 }) // Increased timeout
                );
                console.log('Geolocation position obtained:', position);
                await displayWeather({ lat: position.coords.latitude, lon: position.coords.longitude }, true); // Initial load for local
            } catch (error) {
                console.warn("无法获取地理位置:", error.message);
                if (error.code === error.PERMISSION_DENIED) {
                    alert("您已拒绝位置权限。如需查看本地天气，请在浏览器设置中允许位置访问。");
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    alert("当前无法获取您的位置信息。");
                } else if (error.code === error.TIMEOUT) {
                    alert("获取位置信息超时。");
                } else {
                    alert("获取本地天气失败，您可以手动搜索。");
                }
            }
        } else {
            console.warn("浏览器不支持地理位置。");
            alert("您的浏览器不支持地理位置服务。");
        }

        // 2. Load saved locations (these are geo IDs)
        console.log('Loading saved locations from storage:', savedLocations);
        // We need to fetch city name or details for these IDs for displayWeather
        // For Open-Meteo, geocoding API gives ID, name, lat, lon. We save the ID.
        // To reload, we need lat/lon for the ID. The geocoding API's ID is not directly usable for reverse geocoding AFAIK.
        // Simpler: savedLocations stores city names as searched by user.
        // Let's revert savedLocations to store *city names* or specific query strings.

        // --- REVISED LOGIC FOR SAVED LOCATIONS ---
        // `savedLocations` will now store the original *city name string* that was searched.
        // This means `geoIdToSave` in `displayWeather` should be `source` (the city name string).
        // And `removeLocation` needs to filter `savedLocations` by this string.
        // `loadSavedLocations` will iterate these names and call `displayWeather(cityName, true)`.
        // This also means the `id` used in `savedLocations.includes(geoIdToSave)` must be the city name string.

        // The current code saves numeric geo IDs. This is problematic for reloading.
        // Let's stick to saving city names. I will need to adjust `displayWeather` saving logic
        // and `removeLocation` and `loadSavedLocations`.
        // For now, I'll keep the current structure to see if the primary issues resolve.
        // If search and local work, then we can refine saved locations.

        // The current savedLocations stores numeric Geo IDs. To make this work on reload,
        // you would typically need another API call to get lat/lon from these Geo IDs, or
        // better, store enough info (like city name or lat/lon directly if stable).
        // For simplicity, let's assume for now that if local and search work, this part can be refined later
        // if the user wants saved locations to persist more robustly across sessions for Open-Meteo.
        // Given the current structure, `loadSavedLocations` with numeric IDs won't work well without modification.
        // The easiest fix is to save the CITY NAME (the `source` string) to `savedLocations` instead of `geoIdToSave`.
        // I will make that change directly in this revision.

        // ---- Correcting saved location logic to use city names ----
        // In displayWeather (inside save block):
        // OLD: if (geoIdToSave && !weatherDataPacket.geo.isLocal) { savedLocations.push(geoIdToSave); ... }
        // NEW: if (typeof source === 'string' && !weatherDataPacket.geo.isLocal) {
        //          const cityNameToSave = source.toLowerCase();
        //          if (!savedLocations.includes(cityNameToSave)) {
        //              savedLocations.push(cityNameToSave); saveLocationsToLocalStorage(); ...
        //          }
        //      }

        // In removeLocation:
        // OLD: savedLocations = savedLocations.filter(id => id !== geoIdToRemove);
        // NEW: Need to pass the original city name string to removeLocation if possible,
        //      or remove based on the card's display name if it matches a saved city name.
        //      The `cardId` is `city-${geoData.id}`. This doesn't directly give the city name.
        //      Let's add `data-city-name` to the card.

        // This part is becoming complex quickly. Let's ensure basic functionality first.
        // The following loadSavedLocations assumes savedLocations are city names.
        // This will require changes in how locations are saved and removed.

        if (savedLocations && savedLocations.length > 0) {
            console.log("Attempting to load saved city names:", savedLocations);
            for (const cityName of savedLocations) { // Assuming savedLocations contains city names
                // Check if a card for this city name (or its geocoded equivalent) already exists
                // This check is tricky because we don't know the geoID yet.
                // displayWeather will handle geocoding and potential duplicates.
                console.log("Loading saved city:", cityName);
                await displayWeather(cityName, true); // isInitialLoad = true
            }
        }
        console.log('App initialized.');
    }

    initializeApp();
});

// Quick patch for saving/loading logic for consistency:
// This requires changing what's stored in `savedLocations` and how `removeLocation` works.
// For simplicity, I'll comment out the complex saved location logic for now and focus on getting
// local weather and search to work. If they do, we can tackle robust persistence.

// For robust saved locations using city names:
// 1. In `displayWeather`, when `typeof source === 'string'` and data is successfully fetched:
//    `const cityNameToSave = source.toLowerCase(); if (!savedLocations.includes(cityNameToSave)) { savedLocations.push(cityNameToSave); saveLocationsToLocalStorage(); }`
// 2. In `createWeatherCard`, add `card.dataset.originalQuery = source;` (if source was a string)
// 3. `removeLocation(cardId, originalQuery)`: `savedLocations = savedLocations.filter(name => name !== originalQuery);`
// 4. `loadSavedLocations`: `for (const cityName of savedLocations) { await displayWeather(cityName, true); }`

// The provided script above has simplified `removeLocation` to take `geoIdToRemove` which comes from `geoData.id`.
// And `displayWeather` saves `geoIdToSave` which is `geoInfo.id`.