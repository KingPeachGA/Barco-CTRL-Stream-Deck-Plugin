// Global web socket connection to the Stream Deck software
var websocket = null;

// Global settings from the main plugin (hostname, credentials)
var globalSettings = {};

// The specific settings for the button being configured
var settings = {};

// The unique identifier for the button instance
var context = null;

// A cache for data fetched from the Barco API
const apiCache = {
    workplaces: null,
    sources: null,
    compositions: null,
};

/**
 * The first function executed when the Property Inspector is loaded.
 */
function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo, inActionInfo) {
    websocket = new WebSocket("ws://127.0.0.1:" + inPort);
    context = inPluginUUID;

    // Parse the settings for the current button if they exist
    if (inActionInfo && inActionInfo.payload && inActionInfo.payload.settings) {
        settings = inActionInfo.payload.settings;
    }

    websocket.onopen = function () {
        // Register the Property Inspector with the Stream Deck software
        const json = { "event": inRegisterEvent, "uuid": inPluginUUID };
        websocket.send(JSON.stringify(json));

        // Request the global settings from the main plugin file
        const getGlobalSettingsJson = { "event": "getGlobalSettings", "context": context };
        websocket.send(JSON.stringify(getGlobalSettingsJson));
    };

    websocket.onmessage = function (evt) {
        const jsonObj = JSON.parse(evt.data);
        const event = jsonObj['event'];

        if (event === "didReceiveGlobalSettings") {
            globalSettings = jsonObj.payload.settings;
            // Once we have the global settings, we can initialize the UI
            initializeUI();
        }
    };
}

/**
 * Initializes the UI by fetching data from the Barco API and setting up listeners.
 */
async function initializeUI() {
    loadApiData(); // Using local fallback data
    populateDropdowns();
    setupEventListeners();
    updateUIFromSettings(); // Restore saved settings for this button
}

/**
 * Loads data from the provided JSON files as a fallback.
 * In a production plugin, this would fetch live data from the API.
 */
function loadApiData() {
    // Using the exact data from the JSON files you provided.
    apiCache.workplaces = [
        {"type":"Wall","id":"68828aaa95a1b26c948be45b","name":"Video Wall","displays":[{"connection":"HDMI-1"},{"connection":"HDMI-2"},{"connection":"HDMI-3"},{"connection":"HDMI-1"},{"connection":"HDMI-2"},{"connection":"HDMI-3"},{"connection":"HDMI-1"},{"connection":"HDMI-2"},{"connection":"HDMI-3"},{"connection":"HDMI-1"},{"connection":"HDMI-2"},{"connection":"HDMI-3"},{"connection":"HDMI-1"},{"connection":"HDMI-2"},{"connection":"HDMI-3"}]},
        {"type":"Desk","id":"688374d195a1b26c948be793","name":"SOC Side Wall","displays":[{"connection":"HDMI-1"},{"connection":"HDMI-2"}]},
        {"type":"Desk","id":"68838b4b95a1b26c948be87f","name":"ECC","displays":[{"connection":"HDMI-1"},{"connection":"HDMI-2"},{"connection":"HDMI-3"},{"connection":"HDMI-4"}]},
        {"type":"Desk","id":"68838c6d95a1b26c948be8f3","name":"1206","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838c8b95a1b26c948be926","name":"1207","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838caa95a1b26c948be95e","name":"1208","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838cc895a1b26c948be99b","name":"1209","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838ce095a1b26c948be9dd","name":"1212","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838d0995a1b26c948bea54","name":"1213","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838d2695a1b26c948beaa0","name":"1214","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838d4495a1b26c948beaf1","name":"1216","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838d5c95a1b26c948beb47","name":"1217","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838d7295a1b26c948beba2","name":"1218","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838d9295a1b26c948bec02","name":"1219","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"68838da795a1b26c948bec5e","name":"1220","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"6883954b95a1b26c948bed35","name":"ECR","displays":[{"connection":"HDMI-1"}]},
        {"type":"Desk","id":"6887bd0295a1b26c948c03cb","name":"1205","displays":[{"connection":"HDMI-1"}]}
    ];
    apiCache.sources = [
        {"id":"68828cfba57e445544ace920","name":"GDOT"},
        {"id":"68828deaa57e445544ace936","name":"Click Share"},
        {"id":"68828e31a57e445544ace950","name":"COP Desktop 1"},
        {"id":"68828e91a57e445544ace981","name":"COP Desktop 2"},
        {"id":"68828ec3a57e445544ace9a1","name":"COP Desktop 4"},
        {"id":"68828f07a57e445544ace9c5","name":"COP Desktop 5"},
        {"id":"68828f84a57e445544acea1f","name":"COP Desktop 6"},
        {"id":"68828f48a57e445544ace9ef","name":"COP Desktop 3"},
        {"id":"6883a52da57e445544aced52","name":"CATV 1"},
        {"id":"6883a558a57e445544aced54","name":"CATV 3"},
        {"id":"6883a57aa57e445544aced56","name":"CATV 2"},
        {"id":"6883a74ea57e445544aced5a","name":"GEMA Weather"},
        {"id":"68840fb9a57e445544aced9f","name":"GEMA Dashboards"}
    ];
    apiCache.compositions = [
        {"id":"04404135-b98f-4933-b21c-29cb8d146298","name":"SOC Perspective 2"},
        {"id":"17587ac6-d7c1-4cd6-96df-51b0f5b633c5","name":"SOC Perspective 2 - Clickshare"},
        {"id":"30d8c4e2-926b-4aa8-805a-c32bcb27760c","name":"SOC Perspective 1"}
    ];
}

/**
 * Populates all dropdown menus with data from the cache.
 */
function populateDropdowns() {
    populateSelect('workplace-select', apiCache.workplaces, 'name', 'id');
    populateSelect('source-select', apiCache.sources, 'name', 'id');
    populateSelect('composition-select', apiCache.compositions, 'name', 'id');
}

/**
 * A generic helper function to populate a <select> element.
 */
function populateSelect(selectId, data, textKey, valueKey) {
    const select = document.getElementById(selectId);
    select.innerHTML = `<option value="">Select an option...</option>`;
    if (data) {
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            select.appendChild(option);
        });
    }
}

/**
 * Sets up event listeners for the UI elements to save settings on change.
 */
function setupEventListeners() {
    document.getElementById('action-type-select').addEventListener('change', updateVisibility);
    document.getElementById('workplace-select').addEventListener('change', handleWorkplaceChange);

    document.querySelectorAll('select').forEach(el => {
        el.addEventListener('change', saveSettings);
    });
}

/**
 * Updates the visibility of UI elements based on the selected action.
 */
function updateVisibility() {
    const actionType = document.getElementById('action-type-select').value;
    
    document.getElementById('source-select-container').classList.toggle('hidden', actionType !== 'showSource');
    document.getElementById('composition-select-container').classList.toggle('hidden', actionType !== 'showComposition');
    
    const needsTarget = actionType === 'showSource' || actionType === 'showComposition' || actionType === 'toggleLabels';
    document.getElementById('workplace-select').parentElement.classList.toggle('hidden', !needsTarget);
    
    handleWorkplaceChange(); // Update display selector visibility
}

/**
 * Shows or hides the display selector based on the selected workplace.
 */
function handleWorkplaceChange() {
    const workplaceId = document.getElementById('workplace-select').value;
    const workplace = apiCache.workplaces.find(w => w.id === workplaceId);
    const displayContainer = document.getElementById('display-select-container');

    if (workplace && workplace.displays && workplace.displays.length > 1) {
        const displaySelect = document.getElementById('display-select');
        displaySelect.innerHTML = '<option value="all">All Displays (Replace)</option>';
        workplace.displays.forEach((display, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Display ${display.connection.replace('HDMI-', '')} (Modify)`;
            displaySelect.appendChild(option);
        });
        displayContainer.classList.remove('hidden');
    } else {
        displayContainer.classList.add('hidden');
    }
}

/**
 * Saves the current settings to the Stream Deck software.
 */
function saveSettings() {
    settings.actionType = document.getElementById('action-type-select').value;
    settings.workplaceId = document.getElementById('workplace-select').value;
    settings.displayIndex = document.getElementById('display-select').value;
    settings.sourceId = document.getElementById('source-select').value;
    settings.compositionId = document.getElementById('composition-select').value;

    const json = { "event": "setSettings", "context": context, "payload": settings };
    websocket.send(JSON.stringify(json));
}

/**
 * Restores the UI state from the saved settings for the button.
 */
function updateUIFromSettings() {
    if (settings) {
        document.getElementById('action-type-select').value = settings.actionType || 'showSource';
        document.getElementById('workplace-select').value = settings.workplaceId || '';
        handleWorkplaceChange(); // Populate display dropdown before setting its value
        document.getElementById('display-select').value = settings.displayIndex || 'all';
        document.getElementById('source-select').value = settings.sourceId || '';
        document.getElementById('composition-select').value = settings.compositionId || '';
        updateVisibility();
    }
}
