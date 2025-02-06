package com.tiktoken.videodemo;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Button playButton = findViewById(R.id.playButton);
        playButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Use system video player
                Intent intent = new Intent(Intent.ACTION_VIEW);
                Uri videoUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.demo_video);
                intent.setDataAndType(videoUri, "video/*");
                startActivity(intent);
            }
        });
    }
} 