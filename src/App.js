import logo from './logo.svg'
import './App.css'
import React from 'react'

const getBPMCalcs = (bpm, numBars) => {
	const beatsPerSecond = bpm / 60
	const secondsInBeat = 1 / beatsPerSecond
	const framesPerBeat = secondsInBeat * 60
	const framesPerBar = framesPerBeat * 4
	const framesPerMeasure = framesPerBar * numBars
	const framesPer16thNote = framesPerBar / 16
	const num16thNotes = 16 * numBars

	return {
		bpm,
		secondsInBeat,
		beatsPerSecond,
		framesPerBar,
		framesPerMeasure,
		framesPerBeat,
		framesPer16thNote,
		num16thNotes,
	}
}

//@TODO - this work?
const sortNotes = (a, b) => {
	return a[1] > b[1]
}

const noteTable = [
	'C-2',
	'C#-2',
	'D-2',
	'D#-2',
	'E-2',
	'F-2',
	'F#-2',
	'G-2',
	'G#-2',
	'A-2',
	'A#-2',
	'B-2',

	'C-1',
	'C#-1',
	'D-1',
	'D#-1',
	'E-1',
	'F-1',
	'F#-1',
	'G-1',
	'G#-1',
	'A-1',
	'A#-1',
	'B-1',

	'C0',
	'C#0',
	'D0',
	'D#0',
	'E0',
	'F0',
	'F#0',
	'G0',
	'G#0',
	'A0',
	'A#0',
	'B0',

	'C1',
	'C#1',
	'D1',
	'D#1',
	'E1',
	'F1',
	'F#1',
	'G1',
	'G#1',
	'A1',
	'A#1',
	'B1',

	'C2',
	'C#2',
	'D2',
	'D#2',
	'E2',
	'F2',
	'F#2',
	'G2',
	'G#2',
	'A2',
	'A#2',
	'B2',

	'C3',
	'C#3',
	'D3',
	'D#3',
	'E3',
	'F3',
	'F#3',
	'G3',
	'G#3',
	'A3',
	'A#3',
	'B3',

	'C4',
	'C#4',
	'D4',
	'D#4',
	'E4',
	'F4',
	'F#4',
	'G4',
	'G#4',
	'A4',
	'A#4',
	'B4',

	'C5',
	'C#5',
	'D5',
	'D#5',
	'E5',
	'F5',
	'F#5',
	'G5',
	'G#5',
	'A5',
	'A#5',
	'B5',

	'C6',
	'C#6',
	'D6',
	'D#6',
	'E6',
	'F6',
	'F#6',
	'G6',
	'G#6',
	'A6',
	'A#6',
	'B6',

	'C7',
	'C#7',
	'D7',
	'D#7',
	'E7',
	'F7',
	'F#7',
	'G7',
	'G#7',
	'A7',
	'A#7',
	'B7',

	'C8',
	'C#8',
	'D8',
	'D#8',
	'E8',
	'F8',
	'F#8',
	'G8',
	'G#8',
	'A8',
	'A#8',
	'B8',
]

// MIDI Clock is sent 24 times per quarter note
//

class App extends React.Component {
	constructor() {
		super()

		this.lastTickTime = null
		this.ticks = 0

		this.onKeyDown = this.onKeyDown.bind(this)
		this.onKeyUp = this.onKeyUp.bind(this)
		this.onFrame = this.onFrame.bind(this)
		this.onSetOutput = this.onSetOutput.bind(this)
		this.onSetInput = this.onSetInput.bind(this)
		this.onSetClockType = this.onSetClockType.bind(this)
		this.onSetBPM = this.onSetBPM.bind(this)
		this.onSetActive = this.onSetActive.bind(this)
		this.onMIDIFailure = this.onMIDIFailure.bind(this)
		this.onMIDISuccess = this.onMIDISuccess.bind(this)
		this.onMIDIMessage = this.onMIDIMessage.bind(this)
		this.undo = this.undo.bind(this)

		this.midiInputs = null
		this.midiOutputs = null
		this.frameCounter = 0
		this.barCounter = 0
		this.beatCounter = 0
		this.sixteenthCounter = 0
		this.noteCounter = 0
		this.currentNote = -1

		this.flipFlop = false
		this.calcs = getBPMCalcs(120, 1)
		this.metronomeBuffer = null
		this.audioContext = new AudioContext()
		this.lastBarNotes = null
		this.lastBarIsDirty = false

		console.log(this.calcs)

		this.state = {
			isClearMode: false,
			isFirstNotePlayed: false,
			bpm: 120,
			clockType: 'external',
			isActive: false,
			numBars: 4,
			bar: 0,
			beat: 0,
			sixteenth: 0,
			note: 0,
			events: [],
			notes: new Array(this.calcs.num16thNotes).fill([]),
			midiInputs: {},
			midiOutputs: {},
			selectedOutputId: null,
			selectedInputId: null,
		}

		// this.state.notes[0] = 'X'
		// this.state.notes[4] = 'X'
		// this.state.notes[8] = 'X'
		// this.state.notes[12] = 'X'

		this.state.notes[2] = [[0xff, 60, 127]]
	}

	onSetClockType(event) {
		this.setState({
			clockType: event.target.value,
		})
	}

	onSetBPM(event) {
		this.calcs = getBPMCalcs(event.target.value, 1)
		this.setState({
			bpm: event.target.value,
		})
	}

	onSetActive(newIsActive) {
		this.ticks = 0 //-96
		this.lastTickTime = null
		this.frameCounter = 0
		this.barCounter = 0
		this.beatCounter = 0
		this.sixteenthCounter = 0
		this.noteCounter = 0
		this.currentNote = -1
		this.lastBarNotes = null
		this.lastBarIsDirty = false

		this.setState({
			isActive: newIsActive,
			isFirstNotePlayed: false,
			note: 0,
			bar: 0,
			beat: 0,
			sixteenth: 0,
		})
	}

	onSetInput(event) {
		const id = event.target.value
		Array.from(this.midiInputs.values()).forEach((input) => {
			if (input.id === id) {
				this.setState({
					selectedInputId: id,
				})
			}
		})
	}

	onSetOutput(event) {
		const id = event.target.value
		Array.from(this.midiOutputs.values()).forEach((output) => {
			if (output.id === id) {
				this.setState({
					selectedOutputId: id,
				})
			}
		})
	}

	undo() {
		if (!this.lastBarNotes) {
			return
		}

		this.setState({
			notes: this.lastBarNotes,
		})
		this.lastBarNotes = null
		this.lastBarIsDirty = false
	}

	getSelectedMIDIInput() {
		if (!this.state.selectedInputId) {
			return null
		}

		return this.midiInputs[this.state.selectedInputId]
	}

	getSelectedMIDIOutput() {
		if (!this.state.selectedOutputId) {
			return null
		}

		return this.midiOutputs[this.state.selectedOutputId]
	}

	clearNotes() {
		this.lastBarNotes = null
		this.lastBarIsDirty = false
		this.setState({
			notes: new Array(this.calcs.num16thNotes).fill([]),
		})
	}

	componentDidMount() {
		document.addEventListener('keydown', this.onKeyDown)
		document.addEventListener('keyup', this.onKeyUp)
		window.requestAnimationFrame(this.onFrame)

		this.loadMetronome()

		if (!navigator.requestMIDIAccess) {
			alert('WebMIDI is not supported in this browser.')
		}

		navigator.requestMIDIAccess().then(this.onMIDISuccess, this.onMIDIFailure)
	}

	loadMetronome() {
		const audioContext = new AudioContext()
		let buffer = null

		this.audioSourceNode = audioContext.createBufferSource()
		// const gain = audioContext.createGain()
		const analyser = audioContext.createAnalyser()

		// source.connect(gain)
		// gain.connect(audioContext.destination)

		this.audioSourceNode.connect(audioContext.destination)

		// this.audioSourceNode.loop = true

		const req = new XMLHttpRequest()
		req.open('GET', '/click.wav', true)
		req.responseType = 'arraybuffer'
		req.onload = () => {
			audioContext.decodeAudioData(req.response, (buffer) => {
				this.metronomeBuffer = buffer
				this.audioSourceNode.buffer = buffer
			})

			console.log('START')
		}
		req.send()

		// const res = await fetch('click.wav')
		// const audio = res.arrayBuffer()
		// // const audio = await reader.read()
		// audioContext.decodeAudioData(audio, (data) => (buffer = data))
	}

	playMetronome(volume) {
		if (!this.metronomeBuffer) {
			return
		}

		const source = this.audioContext.createBufferSource()
		const gain = this.audioContext.createGain()

		source.connect(gain)
		gain.connect(this.audioContext.destination)

		source.buffer = this.metronomeBuffer

		gain.gain.value = volume

		source.start()
	}

	onMIDIFailure() {
		alert('Could not access your MIDI devices.')
	}

	onMIDISuccess(midiAccess) {
		this.midiInputs = midiAccess.inputs
		this.midiOutputs = midiAccess.outputs

		const inputs = []
		Array.from(midiAccess.inputs.values()).forEach((input) => {
			console.log('input', input.name)
			this.midiInputs[input.id] = input
			inputs.push({ name: input.name, id: input.id })
			input.onmidimessage = this.onMIDIMessage
		})

		const outputs = []
		Array.from(midiAccess.outputs.values()).forEach((output) => {
			console.log('output', output.name)
			this.midiOutputs[output.id] = output
			outputs.push({ name: output.name, id: output.id })
		})

		this.setState({
			midiInputs: inputs,
			midiOutputs: outputs,
		})
	}

	//501 ms between quarter notes = 120bpm
	//250 ms = 240bpm
	//
	//500 ms = millisecondsPerBeat

	onMIDIMessage(event) {
		// console.log('midi', event)

		const portId = event.target.id
		const isMessageFromSelectedInputPort = portId === this.state.selectedInputId

		switch (event.data[0]) {
			// Clock
			case 0xf8:
				if (this.state.clockType !== 'external' || !this.state.isActive) {
					return
				}

				// console.log('clock', this.ticks, this.currentNote)

				// if (!this.state.isFirstNotePlayed) {
				// 	return
				// }

				// console.log('clock')
				// console.log(this.ticks)
				if (this.ticks === 0) {
					this.currentNote = (this.currentNote + 1) % 16
					// console.log(performance.now())
					////const now = performance.now()
					////const diff = now - this.lastTickTime

					////const bps = 1 / (diff / 1000)
					// console.log('bpm', bps * 60)
					////const bpm = bps * 60

					////this.lastTickTime = now

					//// this.calcs = getBPMCalcs(bpm, 1)
				}
				if (this.ticks < 0) {
					this.ticks++
				} else {
					this.ticks = (this.ticks + 1) % 6
				}

				if (this.currentNote === 0 && this.lastBarIsDirty) {
					this.lastBarNotes = this.state.notes.map((notesArr) => [...notesArr])
					this.lastBarIsDirty = false
				}

				break

			// Start
			case 0xfa:
				console.log('start')
				this.onSetActive(true)
				break

			// Stop
			case 0xfc:
				console.log('stop')
				this.onSetActive(false)
				break

			// Note on
			case 0x90:
			case 0x91:
			case 0x92:
			case 0x93:
			case 0x94:
			case 0x95:
			case 0x96:
			case 0x97:
			case 0x98:
			case 0x99:
			case 0x9a:
			case 0x9b:
			case 0x9c:
			case 0x9d:
			case 0x9e:
			case 0x9f:
				console.log(event)
				console.log(event.target.id, this.state.selectedOutputId)
				console.log(this.inputs, this.outputs, this.midiInputs, this.midiOutputs)

				if (!this.state.isActive) {
					break
				}

				if (!isMessageFromSelectedInputPort) {
					break
				}

				// Don't write zero velocity notes (These can be note off messages)
				if (event.data[2] === 0) {
					break
				}

				this.lastBarIsDirty = true

				if (this.state.isClearMode) {
					this.clearNotesOfType(event.data[0], event.data[1])
				} else {
					this.writeNote(event.data)
				}
		}
	}

	getCurrent16thNote() {
		return this.currentNote
		// const perc = this.frameCounter / this.calcs.framesPerMeasure
		// return Math.floor(perc * this.calcs.num16thNotes)
	}

	getClosest16thNote() {
		// 16 * 4 = 64 16th notes over 4 bars
		// = 480 frames
		return this.currentNote

		const perc = this.frameCounter / this.calcs.framesPerMeasure
		return Math.floor(perc * this.calcs.num16thNotes) % this.calcs.num16thNotes
		// return Math.round(perc * this.calcs.num16thNotes) % this.calcs.num16thNotes
	}

	clearNotesOfType(data1, data2) {
		for (let i = 0, len = this.state.notes.length; i < len; i++) {
			this.state.notes[i] = this.state.notes[i].filter(
				(noteData) => !(noteData[0] === data1 && noteData[1] === data2)
			)
		}
	}

	// frames are 60 per second
	// 120 bpm = 2 beats per second = 2 quarter notes per second
	// = 1 quarter note is 0.5 seconds
	// = 4 quarter notes are 2 seconds
	// (aka a whole note is 2 seconds)
	// 16 notes = 2 / 16 = 0.125 seconds
	// 0.125 seconds * 60 frames = 7.5 frames
	// A whole bar = 30 frames
	// A beat = 30 / 4 = 7.5 frames
	// A sixteenth = 30 / 1.875 frames
	onFrame() {
		if (!this.state.isActive) {
			window.requestAnimationFrame(this.onFrame)
			return
		}

		const newState = {}
		let shouldUpdateState = false

		// if (this.barCounter >= this.calcs.framesPerBar) {
		// 	shouldUpdateState = true
		// 	newState.bar = (this.state.bar + 1) % this.state.numBars
		// 	this.barCounter = 0
		// }

		// if (this.beatCounter >= this.calcs.framesPerBeat) {
		// 	shouldUpdateState = true
		// 	newState.beat = (this.state.beat + 1) % this.state.numBars
		// 	this.beatCounter = 0
		// }

		// if (this.sixteenthCounter >= this.calcs.framesPer16thNote) {
		// 	shouldUpdateState = true
		// 	newState.sixteenth = (this.state.sixteenth + 1) % 16
		// 	// newState.note = (this.state.note + 1) % (16 * this.state.numBars)
		// 	this.sixteenthCounter = 0
		// }

		const curNote = this.getCurrent16thNote()
		if (curNote !== this.state.note) {
			shouldUpdateState = true
			newState.note = curNote
			newState.bpm = this.calcs.bpm

			// console.log('PLAY', this.state.notes[curNote])
			const notesToSend = this.state.notes[curNote]
			if (notesToSend && this.state.selectedOutputId) {
				// console.log('send', noteToSend, output)
				const output = this.getSelectedMIDIOutput()

				for (var i = 0, len = notesToSend.length; i < len; i++) {
					output.send(notesToSend[i])
				}
			}

			if (parseInt(curNote / 4) === curNote / 4) {
				this.playMetronome(parseInt(curNote / 16) === curNote / 16 ? 1 : 0.4)
			}
		}

		if (shouldUpdateState) {
			this.setState(newState)
		}

		this.barCounter++
		this.beatCounter++
		this.sixteenthCounter++
		this.frameCounter++
		if (this.frameCounter >= this.calcs.framesPerMeasure) {
			this.frameCounter = 0
		}

		// document.getElementById('frame-counter').textContent = this.calcs.bpm

		window.requestAnimationFrame(this.onFrame)
	}

	onKeyDown(event) {
		// if (event.key !== ' ') {
		// 	return
		// }

		event.preventDefault()
		// this.clearNotes()

		this.setState({ isClearMode: true })
	}

	onKeyUp(event) {
		this.setState({ isClearMode: false })
	}

	writeNote(data) {
		const note = this.getClosest16thNote()
		const noteArray = this.state.notes[note]

		console.log(note, noteArray)

		// Avoid writing a duplicate note
		for (var i = 0, len = noteArray.length; i < len; i++) {
			if (data[0] === noteArray[i][0] && data[1] === noteArray[i][1]) {
				// Overwrite velocity
				noteArray[i][2] = data[2]
				this.setState({
					isFirstNotePlayed: true,
					notes: [
						...this.state.notes.slice(0, note),
						[...noteArray],
						...this.state.notes.slice(note + 1),
					],
				})
				return
			}
		}

		this.setState({
			isFirstNotePlayed: true,
			notes: [
				...this.state.notes.slice(0, note),
				[...noteArray, data].sort(sortNotes),
				...this.state.notes.slice(note + 1),
			],
		})
	}

	displayMIDIData(notes) {
		return notes.map((data) => {
			const channel = (data[0] & (0xf0 >> 4)) + 1
			const noteNum = data[1]
			const velocity = data[2]

			return 'Ch ' + channel + ', ' + noteTable[noteNum] + ' (' + velocity + ')'
		})
	}

	render() {
		return (
			<div className="App">
				<div className="hardware">
					<div>
						<span>Clock</span>
						<select value={this.state.clockType} onChange={this.onSetClockType}>
							<option value="internal">Internal</option>
							<option value="external">External MIDI</option>
						</select>
						<input
							onChange={this.onSetBPM}
							value={this.state.clockType === 'internal' ? this.state.bpm : ''}
							disabled={this.state.clockType === 'external'}
						/>
						<button onClick={() => this.onSetActive(!this.state.isActive)}>
							{this.state.isActive ? 'Stop' : 'Start'}
						</button>
						<button disabled={this.lastBarNotes === null} onClick={this.undo}>
							Undo
						</button>
					</div>
					<div>
						<span>MIDI Input</span>
						<select value={this.state.selectedInputId} onChange={this.onSetInput}>
							<option value={null}>Select...</option>
							{Object.values(this.state.midiInputs).map((input) => (
								<option value={input.id}>{input.name}</option>
							))}
						</select>
					</div>
					<div>
						<span>MIDI Output</span>
						<select value={this.state.selectedOutputId} onChange={this.onSetOutput}>
							<option value={null}>Select...</option>
							{Object.values(this.state.midiOutputs).map((output) => (
								<option value={output.id}>{output.name}</option>
							))}
						</select>
					</div>
				</div>
				<div id="frame-counter"></div>
				<br></br>
				{this.state.notes.map((data, index) => (
					<p className={index === this.state.note ? 'is-cur-note' : ''} key={index}>
						{(index + 1).toString().padStart(2, '0') + ': ' + (this.displayMIDIData(data) || '')}
					</p>
				))}
			</div>
		)
	}
}

export default App
