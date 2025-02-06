package com.example.emergencyplayer;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.widget.VideoView;
import android.widget.MediaController;
import android.net.Uri;
import android.view.View;
import android.widget.Button;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private WebView webView;
    private VideoView videoView;
    private Button switchButton;
    private boolean isWebView = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        videoView = findViewById(R.id.videoView);
        switchButton = findViewById(R.id.switchButton);

        // Copy video file from assets to internal storage
        File videoFile = new File(getFilesDir(), "test_video.mp4");
        if (!videoFile.exists()) {
            try {
                InputStream in = getAssets().open("test_video.mp4");
                OutputStream out = new FileOutputStream(videoFile);
                byte[] buffer = new byte[1024];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                }
                in.close();
                out.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }

        // Setup WebView
        webView.getSettings().setJavaScriptEnabled(true);
        webView.loadUrl("file:///android_asset/player.html");

        // Setup VideoView
        videoView.setVideoPath(videoFile.getAbsolutePath());
        MediaController mediaController = new MediaController(this);
        mediaController.setAnchorView(videoView);
        videoView.setMediaController(mediaController);

        // Setup switch button
        switchButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (isWebView) {
                    webView.setVisibility(View.GONE);
                    videoView.setVisibility(View.VISIBLE);
                    videoView.start();
                } else {
                    webView.setVisibility(View.VISIBLE);
                    videoView.setVisibility(View.GONE);
                    videoView.pause();
                }
                isWebView = !isWebView;
            }
        });
    }
} 