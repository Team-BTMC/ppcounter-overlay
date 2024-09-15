class WebSocketManager {
  constructor(host) {
    this.version = '0.1.2';

    if (host) {
      this.host = host;
    }

    this.createConnection = this.createConnection.bind(this);

    /**
     * @type {{ [key: string]: WebSocket }} - asd;
     */
    this.sockets = {};
  }

  createConnection(url, callback, filters) {
    let INTERVAL = '';

    const that = this;
    this.sockets[url] = new WebSocket(`ws://${this.host}${url}?l=${encodeURI(window.COUNTER_PATH)}`);

    this.sockets[url].onopen = () => {
      console.log(`[OPEN] ${url}: Connected`);

      if (INTERVAL) clearInterval(INTERVAL);
      if (Array.isArray(filters)) {
        this.sockets[url].send(`applyFilters:${JSON.stringify(filters)}`);
      }
    };

    this.sockets[url].onclose = (event) => {
      console.log(`[CLOSED] ${url}: ${event.reason}`);

      delete this.sockets[url];
      INTERVAL = setTimeout(() => {
        that.createConnection(url, callback, filters);
      }, 1000);
    };

    this.sockets[url].onerror = (event) => {
      console.log(`[ERROR] ${url}: ${event.reason}`);
    };


    this.sockets[url].onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error != null) {
          console.error(`[MESSAGE_ERROR] ${url}:`, data.error);
          return;
        };

        if (data.message != null) {
          if (data.message.error != null) {
            console.error(`[MESSAGE_ERROR] ${url}:`, data.message.error);
            return;
          }
        };

        callback(data);
      } catch (error) {
        console.log(`[MESSAGE_ERROR] ${url}: Couldn't parse incomming message`, error);
      };
    };
  };


  /**
   * Connects to gosu compatible socket api.
   * @param {(data: WEBSOCKET_V1) => void} callback - The function to handle received messages.
   * @param {Filters[]} filters
   */
  api_v1(callback, filters) {
    this.createConnection(`/ws`, callback, filters);
  };


  /**
   * Connects to tosu advanced socket api.
   * @param {(data: WEBSOCKET_V2) => void} callback - The function to handle received messages.
   * @param {Filters[]} filters
   */
  api_v2(callback, filters) {
    this.createConnection(`/websocket/v2`, callback, filters);
  };


  /**
   * Connects to keyOverlay socket api.
   * @param {(data: WEBSOCKET_V2_KEYS) => void} callback - The function to handle received messages.
   * @param {Filters[]} filters
   */
  api_v2_precise(callback, filters) {
    this.createConnection(`/websocket/v2/precise`, callback, filters);
  };


  /**
   * Calculate custom pp for a current, or specified map
   * @param {CALCULATE_PP} params
   * @returns {Promise<CALCULATE_PP_RESPONSE | { error: string }>}
   */
  async calculate_pp(params) {
    try {
      if (typeof params != 'object') {
        return {
          error: 'Wrong argument type, should be object with params'
        };
      };


      const url = new URL(`http://${this.host}/api/calculate/pp`);
      Object.keys(params)
        .forEach(key => url.searchParams.append(key, params[key]));

      const request = await fetch(url, { method: "GET", });


      const json = await request.json();
      return json;
    } catch (error) {
      console.error(error);

      return {
        error: error.message,
      };
    };
  };


  /**
   * Get beatmap **.osu** file (local)
   * @param {string} file_path - Path to a file **beatmap_folder_name/osu_file_name.osu**
   * @returns {string | { error: string }}
   */
  async getBeatmapOsuFile(file_path) {
    try {
      if (typeof file_path != 'object') {
        return {
          error: 'Wrong argument type, should be object with params'
        };
      };


      const request = await fetch(`${this.host}/files/beatmap/${file_path}`, {
        method: "GET",
      });


      const text = await request.text();
      return text;
    } catch (error) {
      console.error(error);

      return {
        error: error.message,
      };
    };
  };


  /**
   * Connects to message
   * @param {(data: { command: string, message: any }) => void} callback - The function to handle received messages.
   */
  commands(callback) {
    this.createConnection(`/websocket/commands`, callback);
  };

  /**
   * 
   * @param {string} name 
   * @param {string|Object} payload 
   */
  sendCommand(name, command, amountOfRetries = 1) {
    const that = this;


    if (!this.sockets['/websocket/commands']) {
      setTimeout(() => {
        that.sendCommand(name, command, amountOfRetries + 1);
      }, 100);

      return;
    };


    try {
      const payload = typeof command == 'object' ? JSON.stringify(command) : command;
      this.sockets['/websocket/commands'].send(`${name}:${payload}`);
    } catch (error) {
      if (amountOfRetries <= 3) {
        console.log(`[COMMAND_ERROR] Attempt ${amountOfRetries}`, error);
        setTimeout(() => {
          that.sendCommand(name, command, amountOfRetries + 1);
        }, 1000);
        return;
      };


      console.error(`[COMMAND_ERROR]`, error);
    };
  };


  close(url) {
    this.host = url;

    const array = Object.keys(this.sockets);
    for (let i = 0; i < array.length; i++) {
      const key = array[i];
      const value = this.sockets[key];

      if (!value) continue;
      value.close();
    };
  };
};


export default WebSocketManager;



/** 
 * @typedef {string | { field: string; keys: Filters[] }} Filters
 */


/** @typedef {object} CALCULATE_PP
 * @property {string} path - Path to .osu file. Example: C:/osu/Songs/beatmap/file.osu
 * @property {number} mode - Osu = 0, Taiko = 1, Catch = 2, Mania = 3
 * @property {number} mods - Mods id. Example: 64 - DT
 * @property {number} acc - Accuracy % from 0 to 100
 * @property {number} nGeki - Amount of Geki (300g / MAX)
 * @property {number} nKatu - Amount of Katu (100k / 200)
 * @property {number} n300 - Amount of 300
 * @property {number} n100 - Amount of 100
 * @property {number} n50 - Amount of 50
 * @property {number} nMisses - Amount of Misses
 * @property {number} combo - combo
 * @property {number} passedObjects - Sum of nGeki, nKatu, n300, n100, n50, nMisses
 * @property {number} clockRate - Map rate number. Example: 1.5 = DT
 */



/** @typedef {object} CALCULATE_PP_RESPONSE
 * @property {object} difficulty
 * @property {number} difficulty.mode
 * @property {number} difficulty.stars
 * @property {boolean} difficulty.isConvert
 * @property {number} difficulty.aim
 * @property {number} difficulty.speed
 * @property {number} difficulty.flashlight
 * @property {number} difficulty.sliderFactor
 * @property {number} difficulty.speedNoteCount
 * @property {number} difficulty.od
 * @property {number} difficulty.hp
 * @property {number} difficulty.nCircles
 * @property {number} difficulty.nSliders
 * @property {number} difficulty.nSpinners
 * @property {number} difficulty.ar
 * @property {number} difficulty.maxCombo
 * @property {object} state
 * @property {number} state.maxCombo
 * @property {number} state.nGeki
 * @property {number} state.nKatu
 * @property {number} state.n300
 * @property {number} state.n100
 * @property {number} state.n50
 * @property {number} state.misses
 * @property {number} pp
 * @property {number} ppAim
 * @property {number} ppFlashlight
 * @property {number} ppSpeed
 * @property {number} ppAccuracy
 * @property {number} effectiveMissCount
 */



/** @typedef {object} WEBSOCKET_V1
 * @property {object} settings
 * @property {boolean} settings.showInterface
 * @property {object} settings.folders
 * @property {string} settings.folders.game
 * @property {string} settings.folders.skin
 * @property {string} settings.folders.songs
 * @property {object} menu
 * @property {object} menu.mainMenu
 * @property {number} menu.mainMenu.bassDensity
 * @property {number} menu.state
 * @property {number} menu.gameMode
 * @property {number} menu.isChatEnabled
 * @property {object} menu.bm
 * @property {object} menu.bm.time
 * @property {number} menu.bm.time.firstObj
 * @property {number} menu.bm.time.current
 * @property {number} menu.bm.time.full
 * @property {number} menu.bm.time.mp3
 * @property {number} menu.bm.id
 * @property {number} menu.bm.set
 * @property {string} menu.bm.md5
 * @property {number} menu.bm.rankedStatus
 * @property {object} menu.bm.metadata
 * @property {string} menu.bm.metadata.artist
 * @property {string} menu.bm.metadata.artistOriginal
 * @property {string} menu.bm.metadata.title
 * @property {string} menu.bm.metadata.titleOriginal
 * @property {string} menu.bm.metadata.mapper
 * @property {string} menu.bm.metadata.difficulty
 * @property {object} menu.bm.stats
 * @property {number} menu.bm.stats.AR
 * @property {number} menu.bm.stats.CS
 * @property {number} menu.bm.stats.OD
 * @property {number} menu.bm.stats.HP
 * @property {number} menu.bm.stats.SR
 * @property {object} menu.bm.stats.BPM
 * @property {number} menu.bm.stats.BPM.common
 * @property {number} menu.bm.stats.BPM.min
 * @property {number} menu.bm.stats.BPM.max
 * @property {number} menu.bm.stats.circles
 * @property {number} menu.bm.stats.sliders
 * @property {number} menu.bm.stats.spinners
 * @property {number} menu.bm.stats.holds
 * @property {number} menu.bm.stats.maxCombo
 * @property {number} menu.bm.stats.fullSR
 * @property {number} menu.bm.stats.memoryAR
 * @property {number} menu.bm.stats.memoryCS
 * @property {number} menu.bm.stats.memoryOD
 * @property {number} menu.bm.stats.memoryHP
 * @property {object} menu.bm.path
 * @property {string} menu.bm.path.full
 * @property {string} menu.bm.path.folder
 * @property {string} menu.bm.path.file
 * @property {string} menu.bm.path.bg
 * @property {string} menu.bm.path.audio
 * @property {object} menu.mods
 * @property {number} menu.mods.num
 * @property {string} menu.mods.str
 * @property {object} menu.pp
 * @property {number} menu.pp.95
 * @property {number} menu.pp.96
 * @property {number} menu.pp.97
 * @property {number} menu.pp.98
 * @property {number} menu.pp.99
 * @property {number} menu.pp.100
 * @property {number[]} menu.pp.strains
 * @property {object} menu.pp.strainsAll
 * @property {object[]} menu.pp.strainsAll.series
 * @property {string} menu.pp.strainsAll.series.name
 * @property {number[]} menu.pp.strainsAll.series.data
 * @property {number[]} menu.pp.strainsAll.xaxis
 * @property {object} gameplay
 * @property {number} gameplay.gameMode
 * @property {string} gameplay.name
 * @property {number} gameplay.score
 * @property {number} gameplay.accuracy
 * @property {object} gameplay.combo
 * @property {number} gameplay.combo.current
 * @property {number} gameplay.combo.max
 * @property {object} gameplay.hp
 * @property {number} gameplay.hp.normal
 * @property {number} gameplay.hp.smooth
 * @property {object} gameplay.hits
 * @property {number} gameplay.hits.0
 * @property {number} gameplay.hits.50
 * @property {number} gameplay.hits.100
 * @property {number} gameplay.hits.300
 * @property {number} gameplay.hits.geki
 * @property {number} gameplay.hits.katu
 * @property {number} gameplay.hits.sliderBreaks
 * @property {object} gameplay.hits.grade
 * @property {string} gameplay.hits.grade.current
 * @property {string} gameplay.hits.grade.maxThisPlay
 * @property {number} gameplay.hits.unstableRate
 * @property {} gameplay.hits.hitErrorArray
 * @property {object} gameplay.pp
 * @property {number} gameplay.pp.current
 * @property {number} gameplay.pp.fc
 * @property {number} gameplay.pp.maxThisPlay
 * @property {object} gameplay.keyOverlay
 * @property {object} gameplay.keyOverlay.k1
 * @property {boolean} gameplay.keyOverlay.k1.isPressed
 * @property {number} gameplay.keyOverlay.k1.count
 * @property {object} gameplay.keyOverlay.k2
 * @property {boolean} gameplay.keyOverlay.k2.isPressed
 * @property {number} gameplay.keyOverlay.k2.count
 * @property {object} gameplay.keyOverlay.m1
 * @property {boolean} gameplay.keyOverlay.m1.isPressed
 * @property {number} gameplay.keyOverlay.m1.count
 * @property {object} gameplay.keyOverlay.m2
 * @property {boolean} gameplay.keyOverlay.m2.isPressed
 * @property {number} gameplay.keyOverlay.m2.count
 * @property {object} gameplay.leaderboard
 * @property {boolean} gameplay.leaderboard.hasLeaderboard
 * @property {boolean} gameplay.leaderboard.isVisible
 * @property {object} gameplay.leaderboard.ourplayer
 * @property {string} gameplay.leaderboard.ourplayer.name
 * @property {number} gameplay.leaderboard.ourplayer.score
 * @property {number} gameplay.leaderboard.ourplayer.combo
 * @property {number} gameplay.leaderboard.ourplayer.maxCombo
 * @property {string} gameplay.leaderboard.ourplayer.mods
 * @property {number} gameplay.leaderboard.ourplayer.h300
 * @property {number} gameplay.leaderboard.ourplayer.h100
 * @property {number} gameplay.leaderboard.ourplayer.h50
 * @property {number} gameplay.leaderboard.ourplayer.h0
 * @property {number} gameplay.leaderboard.ourplayer.team
 * @property {number} gameplay.leaderboard.ourplayer.position
 * @property {number} gameplay.leaderboard.ourplayer.isPassing
 * @property {} gameplay.leaderboard.slots
 * @property {boolean} gameplay._isReplayUiHidden
 * @property {object} resultsScreen
 * @property {number} resultsScreen.0
 * @property {number} resultsScreen.50
 * @property {number} resultsScreen.100
 * @property {number} resultsScreen.300
 * @property {string} resultsScreen.name
 * @property {number} resultsScreen.score
 * @property {number} resultsScreen.maxCombo
 * @property {object} resultsScreen.mods
 * @property {number} resultsScreen.mods.num
 * @property {string} resultsScreen.mods.str
 * @property {number} resultsScreen.geki
 * @property {number} resultsScreen.katu
 * @property {object} userProfile
 * @property {string} userProfile.name
 * @property {number} userProfile.accuracy
 * @property {number} userProfile.rankedScore
 * @property {number} userProfile.id
 * @property {number} userProfile.level
 * @property {number} userProfile.playCount
 * @property {number} userProfile.playMode
 * @property {number} userProfile.rank
 * @property {number} userProfile.countryCode
 * @property {number} userProfile.performancePoints
 * @property {boolean} userProfile.isConnected
 * @property {string} userProfile.backgroundColour
 * @property {object} tourney
 * @property {object} tourney.manager
 * @property {number} tourney.manager.ipcState
 * @property {number} tourney.manager.bestOF
 * @property {object} tourney.manager.teamName
 * @property {string} tourney.manager.teamName.left
 * @property {string} tourney.manager.teamName.right
 * @property {object} tourney.manager.stars
 * @property {number} tourney.manager.stars.left
 * @property {number} tourney.manager.stars.right
 * @property {object} tourney.manager.bools
 * @property {boolean} tourney.manager.bools.scoreVisible
 * @property {boolean} tourney.manager.bools.starsVisible
 * @property {} tourney.manager.chat
 * @property {object} tourney.manager.gameplay
 * @property {object} tourney.manager.gameplay.score
 * @property {number} tourney.manager.gameplay.score.left
 * @property {number} tourney.manager.gameplay.score.right
 * @property {object[]} tourney.ipcClients
 * @property {string} tourney.ipcClients.team
 * @property {object} tourney.ipcClients.spectating
 * @property {string} tourney.ipcClients.spectating.name
 * @property {string} tourney.ipcClients.spectating.country
 * @property {number} tourney.ipcClients.spectating.userID
 * @property {number} tourney.ipcClients.spectating.accuracy
 * @property {number} tourney.ipcClients.spectating.rankedScore
 * @property {number} tourney.ipcClients.spectating.playCount
 * @property {number} tourney.ipcClients.spectating.globalRank
 * @property {number} tourney.ipcClients.spectating.totalPP
 * @property {object} tourney.ipcClients.gameplay
 * @property {number} tourney.ipcClients.gameplay.gameMode
 * @property {string} tourney.ipcClients.gameplay.name
 * @property {number} tourney.ipcClients.gameplay.score
 * @property {number} tourney.ipcClients.gameplay.accuracy
 * @property {object} tourney.ipcClients.gameplay.combo
 * @property {number} tourney.ipcClients.gameplay.combo.current
 * @property {number} tourney.ipcClients.gameplay.combo.max
 * @property {object} tourney.ipcClients.gameplay.hp
 * @property {number} tourney.ipcClients.gameplay.hp.normal
 * @property {number} tourney.ipcClients.gameplay.hp.smooth
 * @property {object} tourney.ipcClients.gameplay.hits
 * @property {number} tourney.ipcClients.gameplay.hits.0
 * @property {number} tourney.ipcClients.gameplay.hits.50
 * @property {number} tourney.ipcClients.gameplay.hits.100
 * @property {number} tourney.ipcClients.gameplay.hits.300
 * @property {number} tourney.ipcClients.gameplay.hits.geki
 * @property {number} tourney.ipcClients.gameplay.hits.katu
 * @property {number} tourney.ipcClients.gameplay.hits.sliderBreaks
 * @property {object} tourney.ipcClients.gameplay.hits.grade
 * @property {string} tourney.ipcClients.gameplay.hits.grade.current
 * @property {string} tourney.ipcClients.gameplay.hits.grade.maxThisPlay
 * @property {number} tourney.ipcClients.gameplay.hits.unstableRate
 * @property {} tourney.ipcClients.gameplay.hits.hitErrorArray
 * @property {object} tourney.ipcClients.gameplay.mods
 * @property {number} tourney.ipcClients.gameplay.mods.num
 * @property {string} tourney.ipcClients.gameplay.mods.str
 */



/** @typedef {object} WEBSOCKET_V2
 * @property {object} state
 * @property {number} state.number
 * @property {string} state.name
 * @property {object} session
 * @property {number} session.playTime
 * @property {number} session.playCount
 * @property {object} settings
 * @property {boolean} settings.interfaceVisible
 * @property {boolean} settings.replayUIVisible
 * @property {object} settings.chatVisibilityStatus
 * @property {number} settings.chatVisibilityStatus.number
 * @property {string} settings.chatVisibilityStatus.name
 * @property {object} settings.leaderboard
 * @property {boolean} settings.leaderboard.visible
 * @property {object} settings.leaderboard.type
 * @property {number} settings.leaderboard.type.number
 * @property {string} settings.leaderboard.type.name
 * @property {object} settings.progressBar
 * @property {number} settings.progressBar.number
 * @property {string} settings.progressBar.name
 * @property {number} settings.bassDensity
 * @property {object} settings.resolution
 * @property {boolean} settings.resolution.fullscreen
 * @property {number} settings.resolution.width
 * @property {number} settings.resolution.height
 * @property {number} settings.resolution.widthFullscreen
 * @property {number} settings.resolution.heightFullscreen
 * @property {object} settings.client
 * @property {boolean} settings.client.updateAvailable
 * @property {number} settings.client.branch
 * @property {string} settings.client.version
 * @property {object} settings.scoreMeter
 * @property {object} settings.scoreMeter.type
 * @property {number} settings.scoreMeter.type.number
 * @property {string} settings.scoreMeter.type.name
 * @property {number} settings.scoreMeter.size
 * @property {object} settings.cursor
 * @property {boolean} settings.cursor.useSkinCursor
 * @property {boolean} settings.cursor.autoSize
 * @property {number} settings.cursor.size
 * @property {object} settings.mouse
 * @property {boolean} settings.mouse.rawInput
 * @property {boolean} settings.mouse.disableButtons
 * @property {boolean} settings.mouse.disableWheel
 * @property {number} settings.mouse.sensitivity
 * @property {object} settings.mania
 * @property {boolean} settings.mania.speedBPMScale
 * @property {boolean} settings.mania.usePerBeatmapSpeedScale
 * @property {object} settings.sort
 * @property {number} settings.sort.number
 * @property {string} settings.sort.name
 * @property {object} settings.group
 * @property {number} settings.group.number
 * @property {string} settings.group.name
 * @property {object} settings.skin
 * @property {boolean} settings.skin.useDefaultSkinInEditor
 * @property {boolean} settings.skin.ignoreBeatmapSkins
 * @property {boolean} settings.skin.tintSliderBall
 * @property {boolean} settings.skin.useTaikoSkin
 * @property {string} settings.skin.name
 * @property {object} settings.mode
 * @property {number} settings.mode.number
 * @property {string} settings.mode.name
 * @property {object} settings.audio
 * @property {boolean} settings.audio.ignoreBeatmapSounds
 * @property {boolean} settings.audio.useSkinSamples
 * @property {object} settings.audio.volume
 * @property {number} settings.audio.volume.master
 * @property {number} settings.audio.volume.music
 * @property {number} settings.audio.volume.effect
 * @property {object} settings.audio.offset
 * @property {number} settings.audio.offset.universal
 * @property {object} settings.background
 * @property {number} settings.background.dim
 * @property {boolean} settings.background.video
 * @property {boolean} settings.background.storyboard
 * @property {object} settings.keybinds
 * @property {object} settings.keybinds.osu
 * @property {string} settings.keybinds.osu.k1
 * @property {string} settings.keybinds.osu.k2
 * @property {string} settings.keybinds.osu.smokeKey
 * @property {object} settings.keybinds.fruits
 * @property {string} settings.keybinds.fruits.k1
 * @property {string} settings.keybinds.fruits.k2
 * @property {string} settings.keybinds.fruits.Dash
 * @property {object} settings.keybinds.taiko
 * @property {string} settings.keybinds.taiko.innerLeft
 * @property {string} settings.keybinds.taiko.innerRight
 * @property {string} settings.keybinds.taiko.outerLeft
 * @property {string} settings.keybinds.taiko.outerRight
 * @property {string} settings.keybinds.quickRetry
 * @property {object} profile
 * @property {object} profile.userStatus
 * @property {number} profile.userStatus.number
 * @property {string} profile.userStatus.name
 * @property {object} profile.banchoStatus
 * @property {number} profile.banchoStatus.number
 * @property {string} profile.banchoStatus.name
 * @property {number} profile.id
 * @property {string} profile.name
 * @property {object} profile.mode
 * @property {number} profile.mode.number
 * @property {number} profile.rankedScore
 * @property {number} profile.level
 * @property {number} profile.accuracy
 * @property {number} profile.pp
 * @property {number} profile.playCount
 * @property {number} profile.globalRank
 * @property {object} profile.countryCode
 * @property {number} profile.countryCode.number
 * @property {string} profile.countryCode.name
 * @property {string} profile.backgroundColour
 * @property {object} beatmap
 * @property {object} beatmap.time
 * @property {number} beatmap.time.live
 * @property {number} beatmap.time.firstObject
 * @property {number} beatmap.time.lastObject
 * @property {number} beatmap.time.mp3Length
 * @property {object} beatmap.status
 * @property {number} beatmap.status.number
 * @property {string} beatmap.status.name
 * @property {string} beatmap.checksum
 * @property {number} beatmap.id
 * @property {number} beatmap.set
 * @property {string} beatmap.artist
 * @property {string} beatmap.artistUnicode
 * @property {string} beatmap.title
 * @property {string} beatmap.titleUnicode
 * @property {string} beatmap.mapper
 * @property {string} beatmap.version
 * @property {object} beatmap.mode
 * @property {number} beatmap.mode.number
 * @property {string} beatmap.mode.name
 * @property {object} beatmap.stats
 * @property {object} beatmap.stats.stars
 * @property {number} beatmap.stats.stars.live
 * @property {number} beatmap.stats.stars.aim
 * @property {number} beatmap.stats.stars.speed
 * @property {number} beatmap.stats.stars.flashlight
 * @property {number} beatmap.stats.stars.sliderFactor
 * @property {number} beatmap.stats.stars.total
 * @property {object} beatmap.stats.ar
 * @property {number} beatmap.stats.ar.original
 * @property {number} beatmap.stats.ar.converted
 * @property {object} beatmap.stats.cs
 * @property {number} beatmap.stats.cs.original
 * @property {number} beatmap.stats.cs.converted
 * @property {object} beatmap.stats.od
 * @property {number} beatmap.stats.od.original
 * @property {number} beatmap.stats.od.converted
 * @property {object} beatmap.stats.hp
 * @property {number} beatmap.stats.hp.original
 * @property {number} beatmap.stats.hp.converted
 * @property {object} beatmap.stats.bpm
 * @property {number} beatmap.stats.bpm.realtime
 * @property {number} beatmap.stats.bpm.common
 * @property {number} beatmap.stats.bpm.min
 * @property {number} beatmap.stats.bpm.max
 * @property {object} beatmap.stats.objects
 * @property {number} beatmap.stats.objects.circles
 * @property {number} beatmap.stats.objects.sliders
 * @property {number} beatmap.stats.objects.spinners
 * @property {number} beatmap.stats.objects.holds
 * @property {number} beatmap.stats.objects.total
 * @property {number} beatmap.stats.maxCombo
 * @property {object} play
 * @property {string} play.playerName
 * @property {object} play.mode
 * @property {number} play.mode.number
 * @property {string} play.mode.name
 * @property {number} play.score
 * @property {number} play.accuracy
 * @property {object} play.healthBar
 * @property {number} play.healthBar.normal
 * @property {number} play.healthBar.smooth
 * @property {object} play.hits
 * @property {number} play.hits.0
 * @property {number} play.hits.50
 * @property {number} play.hits.100
 * @property {number} play.hits.300
 * @property {number} play.hits.geki
 * @property {number} play.hits.katu
 * @property {number} play.hits.sliderBreaks
 * @property {number[]} play.hitErrorArray
 * @property {object} play.combo
 * @property {number} play.combo.current
 * @property {number} play.combo.max
 * @property {object} play.mods
 * @property {number} play.mods.number
 * @property {string} play.mods.name
 * @property {object} play.rank
 * @property {string} play.rank.current
 * @property {string} play.rank.maxThisPlay
 * @property {object} play.pp
 * @property {number} play.pp.current
 * @property {number} play.pp.fc
 * @property {number} play.pp.maxAchievedThisPlay
 * @property {object} play.pp.detailed
 * @property {object} play.pp.detailed.current
 * @property {number} play.pp.detailed.current.aim
 * @property {number} play.pp.detailed.current.speed
 * @property {number} play.pp.detailed.current.accuracy
 * @property {number} play.pp.detailed.current.difficulty
 * @property {number} play.pp.detailed.current.flashlight
 * @property {number} play.pp.detailed.current.total
 * @property {object} play.pp.detailed.fc
 * @property {number} play.pp.detailed.fc.aim
 * @property {number} play.pp.detailed.fc.speed
 * @property {number} play.pp.detailed.fc.accuracy
 * @property {number} play.pp.detailed.fc.difficulty
 * @property {number} play.pp.detailed.fc.flashlight
 * @property {number} play.pp.detailed.fc.total
 * @property {number} play.unstableRate
 * @property {object[]} leaderboard
 * @property {boolean} leaderboard.isFailed
 * @property {number} leaderboard.position
 * @property {number} leaderboard.team
 * @property {number} leaderboard.team
 * @property {string} leaderboard.name
 * @property {number} leaderboard.score
 * @property {number} leaderboard.accuracy
 * @property {object} leaderboard.hits
 * @property {number} leaderboard.hits.0
 * @property {number} leaderboard.hits.50
 * @property {number} leaderboard.hits.100
 * @property {number} leaderboard.hits.300
 * @property {number} leaderboard.hits.geki
 * @property {number} leaderboard.hits.katu
 * @property {object} leaderboard.combo
 * @property {number} leaderboard.combo.current
 * @property {number} leaderboard.combo.max
 * @property {object} leaderboard.mods
 * @property {number} leaderboard.mods.number
 * @property {string} leaderboard.mods.name
 * @property {string} leaderboard.rank
 * @property {object} performance
 * @property {object} performance.accuracy
 * @property {number} performance.accuracy.95
 * @property {number} performance.accuracy.96
 * @property {number} performance.accuracy.97
 * @property {number} performance.accuracy.98
 * @property {number} performance.accuracy.99
 * @property {number} performance.accuracy.100
 * @property {object} performance.graph
 * @property {object[]} performance.graph.series
 * @property {string} performance.graph.series.name
 * @property {number[]} performance.graph.series.data
 * @property {number[]} performance.graph.xaxis
 * @property {object} resultsScreen
 * @property {string} resultsScreen.playerName
 * @property {object} resultsScreen.mode
 * @property {number} resultsScreen.mode.number
 * @property {string} resultsScreen.mode.name
 * @property {number} resultsScreen.score
 * @property {number} resultsScreen.accuracy
 * @property {object} resultsScreen.hits
 * @property {number} resultsScreen.hits.0
 * @property {number} resultsScreen.hits.50
 * @property {number} resultsScreen.hits.100
 * @property {number} resultsScreen.hits.300
 * @property {number} resultsScreen.hits.geki
 * @property {number} resultsScreen.hits.katu
 * @property {object} resultsScreen.mods
 * @property {number} resultsScreen.mods.number
 * @property {string} resultsScreen.mods.name
 * @property {number} resultsScreen.maxCombo
 * @property {string} resultsScreen.rank
 * @property {object} resultsScreen.pp
 * @property {number} resultsScreen.pp.current
 * @property {number} resultsScreen.pp.fc
 * @property {string} resultsScreen.createdAt
 * @property {object} folders
 * @property {string} folders.game
 * @property {string} folders.skin
 * @property {string} folders.songs
 * @property {string} folders.beatmap
 * @property {object} files
 * @property {string} files.beatmap
 * @property {string} files.background
 * @property {string} files.audio
 * @property {object} directPath
 * @property {string} directPath.beatmapFile
 * @property {string} directPath.beatmapBackground
 * @property {string} directPath.beatmapAudio
 * @property {string} directPath.beatmapFolder
 * @property {string} directPath.skinFolder
 * @property {string} directPath.collections
 * @property {string} directPath.osudb
 * @property {string} directPath.scoresdb
 * @property {object} tourney
 * @property {boolean} tourney.scoreVisible
 * @property {boolean} tourney.starsVisible
 * @property {number} tourney.ipcState
 * @property {number} tourney.bestOF
 * @property {object} tourney.team
 * @property {string} tourney.team.left
 * @property {string} tourney.team.right
 * @property {object} tourney.points
 * @property {number} tourney.points.left
 * @property {number} tourney.points.right
 * @property {object[]} tourney.chat
 * @property {string} tourney.chat.team
 * @property {string} tourney.chat.name
 * @property {string} tourney.chat.message
 * @property {string} tourney.chat.timestamp
 * @property {object} tourney.totalScore
 * @property {number} tourney.totalScore.left
 * @property {number} tourney.totalScore.right
 * @property {object[]} tourney.clients
 * @property {number} tourney.clients.ipcId
 * @property {string} tourney.clients.team
 * @property {object} tourney.clients.user
 * @property {number} tourney.clients.user.id
 * @property {string} tourney.clients.user.name
 * @property {string} tourney.clients.user.country
 * @property {number} tourney.clients.user.accuracy
 * @property {number} tourney.clients.user.rankedScore
 * @property {number} tourney.clients.user.playCount
 * @property {number} tourney.clients.user.globalRank
 * @property {number} tourney.clients.user.totalPP
 * @property {object} tourney.clients.play
 * @property {string} tourney.clients.play.playerName
 * @property {object} tourney.clients.play.mode
 * @property {number} tourney.clients.play.mode.number
 * @property {string} tourney.clients.play.mode.name
 * @property {number} tourney.clients.play.score
 * @property {number} tourney.clients.play.accuracy
 * @property {object} tourney.clients.play.healthBar
 * @property {number} tourney.clients.play.healthBar.normal
 * @property {number} tourney.clients.play.healthBar.smooth
 * @property {object} tourney.clients.play.hits
 * @property {number} tourney.clients.play.hits.0
 * @property {number} tourney.clients.play.hits.50
 * @property {number} tourney.clients.play.hits.100
 * @property {number} tourney.clients.play.hits.300
 * @property {number} tourney.clients.play.hits.geki
 * @property {number} tourney.clients.play.hits.katu
 * @property {number} tourney.clients.play.hits.sliderBreaks
 * @property {number[]} tourney.clients.play.hitErrorArray
 * @property {object} tourney.clients.play.mods
 * @property {number} tourney.clients.play.mods.number
 * @property {string} tourney.clients.play.mods.name
 * @property {object} tourney.clients.play.combo
 * @property {number} tourney.clients.play.combo.current
 * @property {number} tourney.clients.play.combo.max
 * @property {object} tourney.clients.play.rank
 * @property {string} tourney.clients.play.rank.current
 * @property {string} tourney.clients.play.rank.maxThisPlay
 * @property {object} tourney.clients.play.pp
 * @property {number} tourney.clients.play.pp.current
 * @property {number} tourney.clients.play.pp.fc
 * @property {number} tourney.clients.play.pp.maxAchievedThisPlay
 * @property {object} tourney.clients.play.pp.detailed
 * @property {object} tourney.clients.play.pp.detailed.current
 * @property {number} tourney.clients.play.pp.detailed.current.aim
 * @property {number} tourney.clients.play.pp.detailed.current.speed
 * @property {number} tourney.clients.play.pp.detailed.current.accuracy
 * @property {number} tourney.clients.play.pp.detailed.current.difficulty
 * @property {number} tourney.clients.play.pp.detailed.current.flashlight
 * @property {number} tourney.clients.play.pp.detailed.current.total
 * @property {object} tourney.clients.play.pp.detailed.fc
 * @property {number} tourney.clients.play.pp.detailed.fc.aim
 * @property {number} tourney.clients.play.pp.detailed.fc.speed
 * @property {number} tourney.clients.play.pp.detailed.fc.accuracy
 * @property {number} tourney.clients.play.pp.detailed.fc.difficulty
 * @property {number} tourney.clients.play.pp.detailed.fc.flashlight
 * @property {number} tourney.clients.play.pp.detailed.fc.total
 * @property {number} tourney.clients.play.unstableRate
 */



/** @typedef {object} WEBSOCKET_V2_KEYS
 * @property {number} currentTime
 * @property {object} keys
 * @property {object} keys.k1
 * @property {boolean} keys.k1.isPressed
 * @property {number} keys.k1.count
 * @property {object} keys.k2
 * @property {boolean} keys.k2.isPressed
 * @property {number} keys.k2.count
 * @property {object} keys.m1
 * @property {boolean} keys.m1.isPressed
 * @property {number} keys.m1.count
 * @property {object} keys.m2
 * @property {boolean} keys.m2.isPressed
 * @property {number} keys.m2.count
 * @property {number[]} hitErrors
 * @property {object[]} tourney
 * @property {number} tourney.ipcId
 * @property {number[]} tourney.hitErrors
 * @property {object} tourney.keys
 * @property {object} tourney.keys.k1
 * @property {boolean} tourney.keys.k1.isPressed
 * @property {number} tourney.keys.k1.count
 * @property {object} tourney.keys.k2
 * @property {boolean} tourney.keys.k2.isPressed
 * @property {number} tourney.keys.k2.count
 * @property {object} tourney.keys.m1
 * @property {boolean} tourney.keys.m1.isPressed
 * @property {number} tourney.keys.m1.count
 * @property {object} tourney.keys.m2
 * @property {boolean} tourney.keys.m2.isPressed
 * @property {number} tourney.keys.m2.count
 */