import * as sdk from "microsoft-cognitiveservices-speech-sdk"

/**
 * Recognition tuning for pronunciation-assessment / read-aloud flows (browser SDK).
 *
 * Microsoft guidance (see Speech SDK issues + Learn docs):
 * - **SpeechServiceResponse_PostProcessingOption**: `"default"` keeps disfluencies (fillers like um/uh)
 *   in the recognition payload; `"TrueText"` removes them for a cleaner transcript.
 * - **OutputFormat.Detailed**: exposes Lexical / ITN / MaskedITN / Display in JSON for richer parsing.
 * - **Speech_SegmentationStrategy `"Time"`** with longer silence + max phrase length: reduces premature
 *   phrase cuts while reading passages with pauses (still streaming until you stop recognition).
 *
 * Note: True “batch” mode for unlimited audio is not a separate flag — you stop recognition when capture
 * ends; segmentation tunes how aggressively the service splits final phrases mid-recording.
 */
export function applyAzureSpeechAssessmentRecognitionPreferences(speechConfig: sdk.SpeechConfig): void {
  try {
    if (sdk.OutputFormat?.Detailed != null) {
      speechConfig.outputFormat = sdk.OutputFormat.Detailed
    }
  } catch {
    /* noop */
  }

  try {
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceResponse_PostProcessingOption, "default")
  } catch {
    try {
      speechConfig.setProperty("SpeechServiceResponse_PostProcessingOption", "default")
    } catch {
      /* noop */
    }
  }

  try {
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceResponse_ProfanityOption, "raw")
  } catch {
    try {
      speechConfig.setProperty("SpeechServiceResponse_ProfanityOption", "raw")
    } catch {
      /* noop */
    }
  }

  try {
    speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationStrategy, "Time")
    speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationMaximumTimeMs, "65000")
    speechConfig.setProperty(sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs, "4000")
  } catch {
    try {
      speechConfig.setProperty("Speech_SegmentationStrategy", "Time")
      speechConfig.setProperty("Speech_SegmentationMaximumTimeMs", "65000")
      speechConfig.setProperty("Speech_SegmentationSilenceTimeoutMs", "4000")
    } catch {
      /* noop */
    }
  }
}
