module.exports = {
	'generic': {
		channels: ['dimmer']
	},
	'showtec-multidim2': {
		channels: ['1', '2', '3', '4']
	},
	'stairville-led-par-36': {
		channels: ['ctrl', 'red', 'green', 'blue', 'speed'],
		ranges: {
			'ctrl': {
				'type': 'option',
				'options': [
					{'value': 0,   'label': 'RGB Control'},
					{'value': 64,  'label': '7 Color Fades'},
					{'value': 128, 'label': '7 color change'},
					{'value': 193, 'label': '3 color change'}
				]
			}
			//speed: 11-100 speed; 151-255 by device, music, inputpoti
		},
		startRgbChannel: 1, //start value for rgb color effects (first channel is 0)
		colors: [ //presets differing from default rgb - e.g. if additional color available, values starting at first rgb channel (see above)
		],
		channelPresets: {}
	},
	'stairville-led-flat': {
		channels: ['dimmer', 'red', 'green', 'blue', 'strobe', 'ctrl', 'group', 'delay'],
		ranges: {
			'ctrl': {
				'type': 'option',
				'options': [
					{'value': 0,   'label': 'RGB Control'},
					{'value': 30,  'label': '7 color fade'},
					{'value': 60,  'label': '3 color fade'},
					{'value': 80,  'label': '7 color change'},
					{'value': 110, 'label': '3 color change'},
					{'value': 190, 'label': 'fade red'},
					{'value': 210, 'label': 'fade green'},
					{'value': 230, 'label': 'fade blue'},
					{'value': 252, 'label': 'Sound activity'}
				]
			}
		},
		startRgbChannel: 1, //start value for rgb color effects (first channel is 0)
		colors: [ //presets differing from default rgb - e.g. if additional color available, values starting at first rgb channel (see above)

		],
		channelPresets: {0: 255} //initialized values at start, e.g. for dimming channels
	},
	'adj-5p-hex': {
		channels: ['red', 'green', 'blue', 'white', 'amber', 'uv', 'dimmer', 'strobe'],
		ranges: {
			'strobe': {
				'type': 'option',
				'options': [
					{'value': 0,   'label': 'Strobe off'},
					{'value': 33,  'label': 'LED On'},
					{'value': 65,  'label': 'Strobe slow-fast'},
					{'value': 97,  'label': 'LED On'},
					{'value': 129, 'label': 'Pulse Strobe slow-fast'},
					{'value': 161, 'label': 'LED On'},
					{'value': 193, 'label': 'Random Strobe slow-fast'},
					{'value': 225, 'label': 'LED On'}
				]
			}
		},
		startRgbChannel: 0, //start value for rgb color effects (first channel is 0)
		colors: [ //presets differing from default rgb - e.g. if additional color available, values starting at first rgb channel (see above)
			{
				label: 'White', //naming convention with existing colors
				values:  {0:0,  1:0,  2:0, 3:255, 4:0}
			},
			{
				label: 'Orange',
				values: { 0:0,  1:0,  2:0, 3:0, 4:255}
			}
			//TODO GENERAL reset special colors on channels above 2 -> special reset
			//or check on change if values above 2 and then set not before set values to 0
			//problem: store current color step (modifications in between?)
			//TODO add uv color for this device
		],
		channelPresets: {6: 255} //initialized values at start, e.g. for dimming channels
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
			}
		},
		startRgbChannel: 3, //start value for rgb color effects (first channel is 0)
		colors: [ //presets differing from default rgb - e.g. if additional color available, values starting at first rgb channel (see above)

		],
		channelPresets:	{1: 255} //initialized values at start, e.g. for dimming channels
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
		startRgbChannel: 1, //start value for rgb color effects (first channel is 0)
		colors: [ //presets differing from default rgb - e.g. if additional color available, values starting at first rgb channel (see above)

		],
		channelPresets: {}
	}
}
