"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
    url: string;
    onComplete: () => void;
}

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

export function VideoPlayer({ url, onComplete }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<any>(null);
    const [isYouTube, setIsYouTube] = useState(false);
    const [videoId, setVideoId] = useState<string>("");

    useEffect(() => {
        if (url.includes('youtube.com/watch') || url.includes('youtu.be')) {
            setIsYouTube(true);
            let vid = "";
            if (url.includes('youtube.com/watch')) {
                vid = new URL(url).searchParams.get("v") || "";
            } else if (url.includes('youtu.be')) {
                vid = url.split('youtu.be/')[1]?.split('?')[0] || "";
            }
            setVideoId(vid);
        } else {
            setIsYouTube(false);
        }
    }, [url]);

    // YouTube API Loading
    useEffect(() => {
        if (!isYouTube || !videoId) return;

        const initPlayer = () => {
            if (window.YT && window.YT.Player) {
                playerRef.current = new window.YT.Player(iframeRef.current, {
                    videoId: videoId,
                    events: {
                        'onStateChange': (event: any) => {
                            if (event.data === window.YT.PlayerState.ENDED) {
                                onComplete();
                            }
                        }
                    },
                    playerVars: {
                        'autoplay': 0,
                        'controls': 1,
                        'rel': 0
                    }
                });
            }
        };

        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                initPlayer();
            };
        } else {
            initPlayer();
        }

        return () => {
            if (playerRef.current && playerRef.current.destroy) {
                playerRef.current.destroy();
            }
        };
    }, [isYouTube, videoId]);

    if (isYouTube) {
        return (
            <div className="w-full aspect-video bg-black relative shadow-lg">
                <div ref={iframeRef as any} className="absolute inset-0 w-full h-full" />
            </div>
        );
    }

    return (
        <div className="w-full aspect-video bg-black relative shadow-lg">
            <video
                ref={videoRef}
                src={url}
                controls
                className="absolute inset-0 w-full h-full"
                onEnded={onComplete}
            />
        </div>
    );
}
