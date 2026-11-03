package com.theimranahmed.tyroecom

import android.app.Application
import android.content.Intent
import android.content.res.Configuration
import android.os.Process
import android.util.Log

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }

  override fun onCreate() {
    // 0. Catch-All Native Uncaught Exception Handler
    // Ensures a standalone release APK never silently exits without displaying the exact crash trace
    Thread.setDefaultUncaughtExceptionHandler { _, throwable ->
      try {
        Log.e("MainApplication", "FATAL NATIVE CRASH INTERCEPTED", throwable)
        val stackTrace = Log.getStackTraceString(throwable)
        val intent = Intent(applicationContext, CrashActivity::class.java).apply {
          putExtra(CrashActivity.EXTRA_CRASH_INFO, stackTrace)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        applicationContext.startActivity(intent)
      } catch (e: Exception) {
        Log.e("MainApplication", "Failed to launch CrashActivity", e)
      } finally {
        Process.killProcess(Process.myPid())
        System.exit(10)
      }
    }

    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
