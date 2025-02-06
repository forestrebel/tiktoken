package com.tiktoken.videodemo;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.util.Log;
import android.widget.Toast;
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.ui.PlayerView;
import com.google.android.exoplayer2.ui.AspectRatioFrameLayout;
import com.google.android.exoplayer2.C;

public class MainActivity extends Activity {
    private static final String TAG = "VideoDemo";
    private PlayerView playerView;
    private ExoPlayer player;
    private Button playButton;
    private Button prevButton;
    private Button nextButton;
    private int currentVideo = 1;
    private static final int TOTAL_VIDEOS = 3;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        playerView = findViewById(R.id.playerView);
        playButton = findViewById(R.id.playButton);
        prevButton = findViewById(R.id.prevButton);
        nextButton = findViewById(R.id.nextButton);

        // Initialize ExoPlayer
        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);
        
        // Configure player view for proper scaling
        playerView.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FILL);
        player.setVideoScalingMode(C.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING);

        // Set up player listener
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_ENDED) {
                    Log.d(TAG, "Video playback completed");
                    // Automatically play next video when current one ends
                    playNextVideo();
                }
            }
        });

        // Set up button click listeners
        playButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                playVideo();
            }
        });

        prevButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                playPreviousVideo();
            }
        });

        nextButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                playNextVideo();
            }
        });
    }

    private void playVideo() {
        try {
            // Get the resource ID for the video
            int videoResource = getResources().getIdentifier(
                "sample_video_" + currentVideo,
                "raw",
                getPackageName()
            );

            if (videoResource == 0) {
                Log.e(TAG, "Video resource not found: sample_video_" + currentVideo);
                Toast.makeText(this, "Video not found", Toast.LENGTH_SHORT).show();
                return;
            }

            Log.d(TAG, "Playing video: sample_video_" + currentVideo);

            // Create media item from resource
            MediaItem mediaItem = MediaItem.fromUri("android.resource://" + getPackageName() + "/" + videoResource);
            
            // Set the media item to play
            player.setMediaItem(mediaItem);
            
            // Prepare and play
            player.prepare();
            player.play();
        } catch (Exception e) {
            Log.e(TAG, "Error playing video", e);
            Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void playNextVideo() {
        currentVideo = (currentVideo % TOTAL_VIDEOS) + 1;
        playVideo();
    }

    private void playPreviousVideo() {
        currentVideo = (currentVideo - 2 + TOTAL_VIDEOS) % TOTAL_VIDEOS + 1;
        playVideo();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) {
            player.pause();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }
} 