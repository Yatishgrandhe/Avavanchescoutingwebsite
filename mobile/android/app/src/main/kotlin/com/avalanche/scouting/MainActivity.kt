package com.avalanche.scouting

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val WEB_APP_BASE = "https://avalanchescouting.vercel.app"

class MainActivity : ComponentActivity() {

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    // Handles the combined Gallery/Camera result
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results = when {
                result.resultCode == RESULT_OK -> {
                    val data = result.data?.data
                    if (data != null) {
                        // User picked a file from gallery
                        arrayOf(data)
                    } else {
                        // User took a photo with camera
                        cameraImageUri?.let { arrayOf(it) }
                    }
                }
                else -> null
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Edge-to-edge support
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT

        setContent {
            AvalancheWebView(
                initialIntent = intent,
                onOpenFileChooser = { callback, params ->
                    filePathCallback = callback
                    openChooser(params)
                }
            )
        }
    }

    private fun openChooser(params: WebChromeClient.FileChooserParams) {
        val captureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (captureIntent.resolveActivity(packageManager) != null) {
            val photoFile = try {
                createImageFile()
            } catch (ex: Exception) {
                null
            }
            if (photoFile != null) {
                val photoURI: Uri = FileProvider.getUriForFile(
                    this,
                    "${applicationContext.packageName}.fileprovider",
                    photoFile
                )
                cameraImageUri = photoURI
                captureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI)
            }
        }

        val contentSelectionIntent = params.createIntent()
        val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
            putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
            putExtra(Intent.EXTRA_TITLE, "Select Action")
            if (cameraImageUri != null) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(captureIntent))
            }
        }

        try {
            fileChooserLauncher.launch(chooserIntent)
        } catch (e: Exception) {
            filePathCallback = null
        }
    }

    private fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("AVALANCHE_${timeStamp}_", ".jpg", storageDir)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AvalancheWebView(
    initialIntent: Intent?,
    onOpenFileChooser: (ValueCallback<Array<Uri>>, WebChromeClient.FileChooserParams) -> Unit
) {
    var isReadyToDisplay by remember { mutableStateOf(false) }
    var canGoBack by remember { mutableStateOf(false) }
    var webViewRef: WebView? by remember { mutableStateOf(null) }
    
    val avalancheNavy = androidx.compose.ui.graphics.Color(0xFF0D1445)

    BackHandler(enabled = canGoBack) {
        webViewRef?.goBack()
    }

    Box(modifier = Modifier.fillMaxSize().background(avalancheNavy)) {
        AndroidView(
            factory = { context ->
                WebView(context).apply {
                    webViewRef = this
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    
                    setBackgroundColor(avalancheNavy.toArgb())
                    
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        cacheMode = WebSettings.LOAD_DEFAULT
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        allowFileAccess = true
                        allowContentAccess = true
                        loadWithOverviewMode = true
                        useWideViewPort = true
                        setSupportZoom(true)
                        builtInZoomControls = true
                        displayZoomControls = false
                        javaScriptCanOpenWindowsAutomatically = true
                        mediaPlaybackRequiresUserGesture = false
                        userAgentString = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
                    }
                    
                    CookieManager.getInstance().setAcceptCookie(true)
                    CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                    
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                            val url = request?.url ?: return false
                            if (!request.isForMainFrame) return false
                            val host = url.host ?: ""
                            return if (host.contains("avalanchescouting.vercel.app") || 
                                host.contains("discord.com") || 
                                host.contains("supabase.co") ||
                                url.scheme == "avalanche-scouting") {
                                false 
                            } else {
                                try {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, url))
                                    true
                                } catch (e: Exception) {
                                    false
                                }
                            }
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            postDelayed({ isReadyToDisplay = true }, 500)
                            canGoBack = view?.canGoBack() ?: false
                        }
                    }
                    
                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) {
                            if (newProgress >= 90) { isReadyToDisplay = true }
                            canGoBack = view?.canGoBack() ?: false
                        }
                        
                        override fun onShowFileChooser(w: WebView?, f: ValueCallback<Array<Uri>>?, p: FileChooserParams?): Boolean {
                            if (f != null && p != null) { onOpenFileChooser(f, p); return true }
                            return false
                        }

                        override fun onCreateWindow(view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: android.os.Message?): Boolean {
                            val transport = resultMsg?.obj as? WebView.WebViewTransport
                            if (transport != null) {
                                val newWebView = WebView(context)
                                transport.webView = newWebView
                                resultMsg.sendToTarget()
                                return true
                            }
                            return false
                        }
                    }
                    loadUrl(getTargetUrl(initialIntent))
                }
            },
            modifier = Modifier.fillMaxSize().statusBarsPadding()
        )

        AnimatedVisibility(visible = !isReadyToDisplay, exit = fadeOut()) {
            Box(modifier = Modifier.fillMaxSize().background(avalancheNavy), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Image(painter = painterResource(id = R.drawable.avalanche_logo), contentDescription = null, modifier = Modifier.size(160.dp))
                    Spacer(modifier = Modifier.height(32.dp))
                    CircularProgressIndicator(color = androidx.compose.ui.graphics.Color.White, strokeWidth = 3.dp, modifier = Modifier.size(32.dp))
                }
            }
        }
    }
}

private fun getTargetUrl(intent: Intent?): String {
    val data = intent?.data
    return if (data != null && data.scheme == "avalanche-scouting") {
        val query = data.query ?: ""
        if (query.isNotEmpty()) "$WEB_APP_BASE/auth/callback?$query" else "$WEB_APP_BASE/auth/callback"
    } else {
        WEB_APP_BASE
    }
}
