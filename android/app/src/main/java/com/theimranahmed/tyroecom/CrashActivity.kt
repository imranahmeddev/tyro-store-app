package com.theimranahmed.tyroecom

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

class CrashActivity : Activity() {

  companion object {
    const val EXTRA_CRASH_INFO = "EXTRA_CRASH_INFO"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val crashDetails = intent.getStringExtra(EXTRA_CRASH_INFO) ?: "Unknown Native Error"

    // Root Container
    val rootLayout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.parseColor("#0f172a")) // Dark navy / slate
      setPadding(40, 60, 40, 40)
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
      )
    }

    // Title Badge
    val titleView = TextView(this).apply {
      text = "🚨 Native Startup Crash Caught"
      setTextColor(Color.parseColor("#ef4444")) // Red
      textSize = 20f
      typeface = Typeface.DEFAULT_BOLD
      setPadding(0, 0, 0, 16)
    }
    rootLayout.addView(titleView)

    // Subtitle
    val subtitleView = TextView(this).apply {
      text = "A fatal Java/Kotlin/JNI exception occurred before the React Native UI could mount. Details below:"
      setTextColor(Color.parseColor("#94a3b8")) // Slate 400
      textSize = 13f
      setPadding(0, 0, 0, 24)
    }
    rootLayout.addView(subtitleView)

    // Action Buttons Container
    val buttonLayout = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT
      ).apply {
        bottomMargin = 24
      }
    }

    val copyButton = Button(this).apply {
      text = "📋 Copy Crash Log"
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.parseColor("#2563eb")) // Blue
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
        marginEnd = 12
      }
      setOnClickListener {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Tyro Crash Trace", crashDetails)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(this@CrashActivity, "Crash log copied to clipboard!", Toast.LENGTH_SHORT).show()
      }
    }
    buttonLayout.addView(copyButton)

    val restartButton = Button(this).apply {
      text = "🔄 Restart App"
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.parseColor("#334155")) // Slate
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
        marginStart = 12
      }
      setOnClickListener {
        val restartIntent = packageManager.getLaunchIntentForPackage(packageName)
        if (restartIntent != null) {
          restartIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
          startActivity(restartIntent)
        }
        finish()
      }
    }
    buttonLayout.addView(restartButton)

    rootLayout.addView(buttonLayout)

    // Scrollable Stack Trace
    val scrollView = ScrollView(this).apply {
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        0,
        1f
      )
      setBackgroundColor(Color.parseColor("#020617")) // Black slate
      setPadding(24, 24, 24, 24)
    }

    val stackTraceView = TextView(this).apply {
      text = crashDetails
      setTextColor(Color.parseColor("#f8fafc"))
      textSize = 11f
      typeface = Typeface.MONOSPACE
      setTextIsSelectable(true)
    }
    scrollView.addView(stackTraceView)

    rootLayout.addView(scrollView)

    setContentView(rootLayout)
  }
}
