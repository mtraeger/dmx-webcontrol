module.exports = {
	'generic': {
		channels: ['dimmer']
	},
	'generic-rgb': {
		channels: ['red', 'green', 'blue'],
		startRgbChannel: 0
	},
	'showtec-multidim2': {
		channels: ['1', '2', '3', '4']
	},
	'eurolite-led-bar': {
		channels: ['ctrl', 'dimmer', 'strobe', 'red0', 'green0', 'blue0', 'red1', 'green1', 'blue1', 'red2', 'green2', 'blue2'],
		ranges: {
			'ctrl': {
				'type': 'option',
				'options': [
					{'value':   0, 'label': 'Black Out'},
					{'value':   1, 'label': 'Dimmer 1'},
					{'value':  16, 'label': 'Dimmer 2'},
					{'value':  32, 'label': 'Red'},
					{'value':  48, 'label': 'Green'},
					{'value':  64, 'label': 'Blue'},
					{'value':  80, 'label': 'Purple'},
					{'value':  96, 'label': 'Yellow'},
					{'value': 112, 'label': 'Cyan'},
					{'value': 128, 'label': 'White'},
					{'value': 144, 'label': 'Color change'},
					{'value': 160, 'label': 'Color flow'},
					{'value': 176, 'label': 'Color dream'},
					{'value': 192, 'label': 'Multi flow'},
					{'value': 208, 'label': 'Dream flow'},
					{'value': 224, 'label': 'Two color flow'},
					{'value': 240, 'label': 'Sound activity'}		
				]
			},
			'dimmer': {
				'type': 'slider',
				'min': 0,
				'max': 255
			},
			startRgbChannel: 3,
			channelPresets: {1: 255}
		}
	},
	'stairville-led-par-56': {
		channels: ['ctrl', 'red', 'green', 'blue', 'speed'],
		ranges: {
			'ctrl': {
				'type': 'option',
				'options': [
					{'value': 0,   'label': 'RGB Control'},
					{'value': 64,  'label': '7 color fade'},
					{'value': 128, 'label': '7 color change'},
					{'value': 192, 'label': '3 color change'}
				]
			}
		},
		startRgbChannel: 1,
		channelPresets: {}
	},
	'ultra-pro-24ch-rdm': {
		channels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24' ]
	},
	'ultra-pro-6rgbch-rdm': {
		channels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24' ],
		channelgroups: ['1', '2', '3', '4', '5', '6']
	},
	'oppsk-cob-uv-par': {
		channels: ['dimmer', 'strobe', 'program-speed', 'sound-activity']
	},
	'lixda-par12-led': {
		channels: ['ctrl', 'static-color', 'speed', 'dimmer', 'red', 'green', 'blue', 'white'],
		ranges: {
			'ctrl': {
				'type': 'option',
				'options': [
					{'value': 0,   'label': 'Off'},
					{'value': 11,  'label': 'Static Color'},
					{'value': 51,  'label': 'Jump'},
					{'value': 101, 'label': 'Gradual'},
					{'value': 151, 'label': 'Sound Activate'},
					{'value': 200, 'label': 'Strobe'}
				]
			},
			'static-color': {
				'type': 'option',
				'options': [
					{'value': 0,   'label': 'All Color'},
					{'value': 40,  'label': 'Red'},
					{'value': 50,  'label': 'Green'},
					{'value': 60,  'label': 'Blue'},
					{'value': 70,  'label': 'Yellow'},
					{'value': 80,  'label': 'Cyan'},
					{'value': 90,  'label': 'Purple'},
					{'value': 100, 'label': 'White'},
					{'value': 110, 'label': 'Red + Green'},
					{'value': 120, 'label': 'Red + Blue'},
					{'value': 130, 'label': 'Red + White'},
					{'value': 140, 'label': 'Green + Blue'},
					{'value': 150, 'label': 'Green + White'},
					{'value': 160, 'label': 'Blue + White'},
					{'value': 170, 'label': 'Red + Green + White'},
					{'value': 180, 'label': 'Red + Blue + White'},
					{'value': 190, 'label': 'Green + Blue + White'},
					{'value': 200, 'label': 'Red + Green + Blue'},
					{'value': 210, 'label': 'Red + Green + Blue + White'}
				]
			}
		}
	},
    'stairville-led-par-36': {
        channels: ['ctrl', 'red', 'green', 'blue', 'speed'],
        ranges: {
            'ctrl': {
                'type': 'option',
                'options': [
                    {'value': 0, 'label': 'RGB Control'},
                    {'value': 64, 'label': '7 Color Fades'},
                    {'value': 128, 'label': '7 color change'},
                    {'value': 193, 'label': '3 color change'}
                ]
            }
            //speed: 11-100 speed; 151-255 by device, music, inputpoti
        },
        startRgbChannel: 1,
        channelPresets: {}
    },
    'stairville-led-flat': {
        channels: ['dimmer', 'red', 'green', 'blue', 'strobe', 'ctrl', 'group', 'delay'],
        ranges: {
            'ctrl': {
                'type': 'option',
                'options': [
                    {'value': 0, 'label': 'RGB Control'},
                    {'value': 30, 'label': '7 color fade'},
                    {'value': 60, 'label': '3 color fade'},
                    {'value': 80, 'label': '7 color change'},
                    {'value': 110, 'label': '3 color change'},
                    {'value': 190, 'label': 'fade red'},
                    {'value': 210, 'label': 'fade green'},
                    {'value': 230, 'label': 'fade blue'},
                    {'value': 252, 'label': 'Sound activity'}
                ]
            }
        },
        startRgbChannel: 1,
        channelPresets: {0: 255}
    },
    'showtec-spectral-m800': {
        channels: ['dimmer', 'red', 'green', 'blue', 'strobe'],
        startRgbChannel: 1,
        channelPresets: {0: 255}
    },
    'adj-5p-hex': {
        channels: ['red', 'green', 'blue', 'white', 'amber', 'uv', 'dimmer', 'strobe'],
        ranges: {
            'strobe': {
                'type': 'option',
                'options': [
                    {'value': 0, 'label': 'Strobe off'},
                    {'value': 33, 'label': 'LED On'},
                    {'value': 65, 'label': 'Strobe slow-fast'},
                    {'value': 97, 'label': 'LED On'},
                    {'value': 129, 'label': 'Pulse Strobe slow-fast'},
                    {'value': 161, 'label': 'LED On'},
                    {'value': 193, 'label': 'Random Strobe slow-fast'},
                    {'value': 225, 'label': 'LED On'}
                ]
            }
        },
        startRgbChannel: 0, // start value for rgb color effects (first channel is 0)
        overrideColors: [ // presets differing from default rgb - e.g. if additional color available, values starting with 0 at first rgb channel (startRgbChannel)
            {
                label: 'White', // naming convention with existing colors
                values: {0: 0, 1: 0, 2: 0, 3: 255, 4: 0}
            },
            {
                label: 'Orange',
                values: {0: 255, 1: 0, 2: 0, 3: 0, 4: 175}
            },
            {
                label: 'Yellow',
                values: {0: 0, 1: 15, 2: 0, 3: 0, 4: 255}
            },
            {
                label: 'OVERRIDE_ZERO', // required for reseting other than rgb channels
                values: {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
            }
        ],
        channelPresets: {6: 255, 7: 255} // initialized values at start, e.g. for dimming channels
    },
    'artnet-weblight': {
        channels: ['dimmer', 'red', 'green', 'blue', 'border', 'blur', 'image'],
        ranges: {
            'image': {
                'type': 'option',
                'options': [
                    {'value': 0, 'label': 'none'},
                    {'value': 10, 'label': 'Image 1'},
                    {'value': 20, 'label': 'Image 2'},
                    {'value': 30, 'label': 'Image 3'},
                    //complete me...
                ]
            }
        },
        startRgbChannel: 1,
        overrideColors: [
            {
                label: 'Yellow',
                values: {0: 255, 1: 160, 2: 0}
            },
        ],
        channelPresets: {0: 255}
    },
    'stairville-strobo': {
        channels: ['speed', 'dimmer']
    },
	'eurolite-led-tha-120PC': {
		channels: ['red', 'green', 'blue', 'white', 'dimmer', 'strobe', 'effect']
	},
	'briteq-bt-theatre-60FC': {
		channels: ['dimmer', 'strobe', 'effect', 'red', 'green', 'blue', 'white']
	},
	'lalucenatz-led-4ch': {
		channels: ['master', 'red', 'green', 'blue']
        },
}
