package __PACKAGE_NAME__

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.google.mlkit.common.MlKitException
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizer
import com.google.mlkit.vision.digitalink.recognition.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.recognition.Ink
import com.google.mlkit.vision.digitalink.recognition.RecognitionContext
import com.google.mlkit.vision.digitalink.recognition.WritingArea

class OmniTaskHandwritingModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "OmniTaskHandwriting"

  @ReactMethod
  fun recognize(strokes: ReadableArray, languageTag: String, width: Double, height: Double, promise: Promise) {
    if (strokes.size() == 0) {
      promise.reject("empty-ink", "Select at least one handwriting stroke.")
      return
    }
    val identifier = try { DigitalInkRecognitionModelIdentifier.fromLanguageTag(languageTag) }
    catch (error: MlKitException) {
      promise.reject("unsupported-language", "The handwriting language is not supported.", error)
      return
    }
    if (identifier == null) {
      promise.reject("unsupported-language", "The handwriting language is not supported.")
      return
    }
    val inkBuilder = Ink.builder()
    var timestamp = System.currentTimeMillis()
    for (strokeIndex in 0 until strokes.size()) {
      val points = strokes.getArray(strokeIndex) ?: continue
      if (points.size() == 0) continue
      val strokeBuilder = Ink.Stroke.builder()
      for (pointIndex in 0 until points.size()) {
        val point = points.getMap(pointIndex) ?: continue
        strokeBuilder.addPoint(Ink.Point.create(point.getDouble("x").toFloat(), point.getDouble("y").toFloat(), timestamp++))
      }
      inkBuilder.addStroke(strokeBuilder.build())
    }
    val model = DigitalInkRecognitionModel.builder(identifier).build()
    val manager = RemoteModelManager.getInstance()
    manager.isModelDownloaded(model)
      .addOnSuccessListener { downloaded ->
        if (downloaded) recognizeInk(model, inkBuilder.build(), width, height, promise)
        else manager.download(model, DownloadConditions.Builder().build())
          .addOnSuccessListener { recognizeInk(model, inkBuilder.build(), width, height, promise) }
          .addOnFailureListener { error -> promise.reject("model-download-failed", "The handwriting model could not be downloaded. Check your connection and try again.", error) }
      }
      .addOnFailureListener { error -> promise.reject("model-check-failed", "The handwriting model is unavailable.", error) }
  }

  private fun recognizeInk(model: DigitalInkRecognitionModel, ink: Ink, width: Double, height: Double, promise: Promise) {
    val recognizer: DigitalInkRecognizer = DigitalInkRecognition.getClient(DigitalInkRecognizerOptions.builder(model).build())
    val context = RecognitionContext.builder().setWritingArea(WritingArea(width.toFloat().coerceAtLeast(1f), height.toFloat().coerceAtLeast(1f))).build()
    recognizer.recognize(ink, context)
      .addOnSuccessListener { result ->
        val candidates = Arguments.createArray()
        result.candidates.take(5).forEach { candidates.pushString(it.text) }
        val response = Arguments.createMap()
        response.putArray("candidates", candidates)
        promise.resolve(response)
        recognizer.close()
      }
      .addOnFailureListener { error ->
        promise.reject("recognition-failed", "The handwriting could not be recognized. Try selecting clearer strokes.", error)
        recognizer.close()
      }
  }
}
