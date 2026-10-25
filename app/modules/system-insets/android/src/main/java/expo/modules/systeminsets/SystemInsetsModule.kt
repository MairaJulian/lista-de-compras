package expo.modules.systeminsets

import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Márgenes seguros del sistema (barra de estado, barra de navegación, recorte de pantalla) en dp.
 * Reemplaza a react-native-safe-area-context, que no compila con la ruta del repo en Windows.
 */
class SystemInsetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SystemInsets")

    // Devuelve null si la ventana todavía no tiene márgenes (antes del primer layout).
    Function("getInsets") {
      val activity = appContext.currentActivity ?: return@Function null
      val decor = activity.window.decorView
      val insets = ViewCompat.getRootWindowInsets(decor) ?: return@Function null
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      val density = activity.resources.displayMetrics.density
      mapOf(
        "top" to bars.top / density,
        "bottom" to bars.bottom / density,
        "left" to bars.left / density,
        "right" to bars.right / density
      )
    }
  }
}
