/** This module performs audio->text transcription using Deepgram. */

import pkg from '@deepgram/sdk';
const { Deepgram } = pkg;
import { PrerecordedTranscriptionResponse } from '@deepgram/sdk/dist/types';

import { Podcast, Episode } from 'podverse-types';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';
if (!DEEPGRAM_API_KEY) throw new Error('Missing DEEPGRAM_API_KEY environment variable.');

/** Process the given episode, transcribing its audio, and creating a text transcript. */
//export async function ProcessEpisode(episode: Episode): Promise<Episode> {}

/** Transcribe the given audio file and return the text of the transcript. */
export async function Transcribe(audioUrl: string): Promise<string> {
  const deepgram = new Deepgram(DEEPGRAM_API_KEY);
  const source = {
    url: audioUrl,
  };
  const result = await deepgram.transcription.preRecorded(source, {
    smart_format: true,
    model: 'nova',
    punctuate: true,
    diarize: true,
    paragraphs: true,
    speaker_labels: true,
  });
  const transcript =
    result.results?.channels[0].alternatives[0].paragraphs?.transcript ||
    result.results?.channels[0].alternatives[0].transcript ||
    '';
  return transcript;
}

const url =
  'https://arttrk.com/p/MTCST/aphid.fireside.fm/d/1437767933/8658dd0c-baa7-4412-9466-918650a0013d/dee3ef76-c1b5-4240-8851-d8b3ab7473ba.mp3';
const result = await Transcribe(url);
console.log(result);
