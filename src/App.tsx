/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Beer, RefreshCcw, Share2 } from 'lucide-react';

class Bubble {
    x: number;
    y: number;
    radius: number;
    speed: number;
    wobble: number;
    wobbleSpeed: number;

    constructor(W: number, H: number) {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.radius = Math.random() * 4 + 1;
        this.speed = Math.random() * 3 + 1;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.1 + 0.05;
    }

    update(W: number, H: number, surface: number[][], V: number) {
        this.y -= this.speed;
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 1;

        let surfaceY = 0;
        if (surface.length === 2) {
            const [p1, p2] = surface;
            if (p2[0] !== p1[0]) {
                const t = (this.x - p1[0]) / (p2[0] - p1[0]);
                surfaceY = p1[1] + t * (p2[1] - p1[1]);
            } else {
                surfaceY = p1[1];
            }
        }

        if (this.y < surfaceY - 10 || V <= 0) {
            this.y = H + Math.random() * 50;
            this.x = Math.random() * W;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
    }
}

function getLiquidShape(W: number, H: number, V: number, theta: number) {
    if (V <= 0) return { polygon: [], surface: [] };
    if (V >= 1) return {
        polygon: [[0, H], [W, H], [W, 0], [0, 0]],
        surface: [[0, 0], [W, 0]]
    };

    let m = Math.tan(theta);
    let isFlipped = false;
    if (m < 0) {
        m = -m;
        isFlipped = true;
    }

    let A = V * W * H;
    let polygon: number[][] = [];
    let surface: number[][] = [];

    if (A <= 0.5 * W * W * m) {
        let base = Math.sqrt(2 * A / m);
        let h_tri = base * m;
        let x_bottom = W - base;
        let y_right = H - h_tri;
        polygon = [
            [x_bottom, H],
            [W, H],
            [W, y_right]
        ];
        surface = [[x_bottom, H], [W, y_right]];
    } else if (A >= W * H - 0.5 * W * W * m) {
        let empty_A = W * H - A;
        let top_base = Math.sqrt(2 * empty_A / m);
        let h_tri = top_base * m;
        polygon = [
            [0, H],
            [W, H],
            [W, 0],
            [top_base, 0],
            [0, h_tri]
        ];
        surface = [[0, h_tri], [top_base, 0]];
    } else {
        let h_center = A / W;
        let y_right = H - h_center - m * W / 2;
        let y_left = H - h_center + m * W / 2;
        polygon = [
            [0, H],
            [W, H],
            [W, y_right],
            [0, y_left]
        ];
        surface = [[0, y_left], [W, y_right]];
    }

    if (isFlipped) {
        polygon = polygon.map(p => [W - p[0], p[1]]);
        surface = surface.map(p => [W - p[0], p[1]]);
        surface = [surface[1], surface[0]];
        polygon.reverse();
    }

    return { polygon, surface };
}

export default function App() {
    const [hasPermission, setHasPermission] = useState(false);
    const [uiVolume, setUiVolume] = useState(1.0);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const volumeRef = useRef(1.0);
    const orientationRef = useRef({ beta: 90, gamma: 0 });
    const hasReceivedOrientation = useRef(false);
    const bubblesRef = useRef<Bubble[]>([]);

    const requestAccess = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                if (permission === 'granted') {
                    setHasPermission(true);
                } else {
                    alert('A permissão para acessar a orientação do dispositivo foi negada.');
                }
            } catch (error) {
                console.error(error);
                setHasPermission(true);
            }
        } else {
            setHasPermission(true);
        }
    };

    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (e.beta !== null && e.gamma !== null) {
                hasReceivedOrientation.current = true;
                orientationRef.current = {
                    beta: e.beta,
                    gamma: e.gamma
                };
            }
        };
        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!hasReceivedOrientation.current) {
                const x = e.clientX / window.innerWidth;
                const y = e.clientY / window.innerHeight;
                orientationRef.current = {
                    gamma: (x - 0.5) * 90,
                    beta: 90 - y * 130
                };
            }
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (!hasReceivedOrientation.current && e.touches.length > 0) {
                const x = e.touches[0].clientX / window.innerWidth;
                const y = e.touches[0].clientY / window.innerHeight;
                orientationRef.current = {
                    gamma: (x - 0.5) * 90,
                    beta: 90 - y * 130
                };
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    useEffect(() => {
        if (!hasPermission) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let lastReportedVolume = volumeRef.current;

        bubblesRef.current = Array.from({ length: 80 }, () => new Bubble(window.innerWidth, window.innerHeight));

        const render = () => {
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            const W = canvas.width;
            const H = canvas.height;
            let V = volumeRef.current;
            const { beta, gamma } = orientationRef.current;

            ctx.clearRect(0, 0, W, H);

            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, W, H);

            let tiltAngle = (gamma * Math.PI) / 180;
            tiltAngle = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, tiltAngle));

            const { polygon, surface } = getLiquidShape(W, H, V, tiltAngle);

            if (polygon.length > 0) {
                ctx.beginPath();
                ctx.moveTo(polygon[0][0], polygon[0][1]);
                for (let i = 1; i < polygon.length; i++) {
                    ctx.lineTo(polygon[i][0], polygon[i][1]);
                }
                ctx.closePath();

                const minY = Math.min(...polygon.map(p => p[1]));
                const gradient = ctx.createLinearGradient(0, minY, 0, H);
                gradient.addColorStop(0, '#f39c12');
                gradient.addColorStop(1, '#d35400');
                ctx.fillStyle = gradient;
                ctx.fill();

                bubblesRef.current.forEach(bubble => {
                    bubble.update(W, H, surface, V);
                    bubble.draw(ctx);
                });

                if (surface.length === 2) {
                    ctx.beginPath();
                    ctx.moveTo(surface[0][0], surface[0][1]);
                    ctx.lineTo(surface[1][0], surface[1][1]);
                    ctx.strokeStyle = '#fffdf0';
                    ctx.lineWidth = Math.min(40, V * 200 + 10);
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
            }

            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(0, 0, W * 0.15, H);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.fillRect(W * 0.85, 0, W * 0.1, H);

            let isSpilling = false;
            if (surface.length === 2) {
                if (surface[0][1] <= 0 || surface[1][1] <= 0) {
                    isSpilling = true;
                }
            }

            let pourRate = 0;
            if (isSpilling) pourRate += 0.003;

            // Only drink when the phone is tilted past horizontal (like a glass)
            if (beta < -5 && beta > -180) {
                pourRate += Math.max(0, (-5 - beta) / 40) * 0.008;
            }

            if (pourRate > 0 && V > 0) {
                volumeRef.current = Math.max(0, V - pourRate);
            }

            if (Math.abs(volumeRef.current - lastReportedVolume) > 0.02 || volumeRef.current === 0) {
                setUiVolume(volumeRef.current);
                lastReportedVolume = volumeRef.current;
            }

            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [hasPermission]);

    const refill = () => {
        volumeRef.current = 1.0;
        setUiVolume(1.0);
    };

    const handleShare = () => {
        const text = "Olha essa incrível simulação de bebidas! 🍺 Acesse aqui: " + window.location.href;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black select-none touch-none">
            {!hasPermission ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white z-50 p-6">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="flex flex-col items-center gap-6 text-center"
                    >
                        <motion.div 
                            animate={{ y: [0, -15, 0], rotate: [0, -5, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="w-32 h-32 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                        >
                            <Beer size={64} className="text-amber-500" />
                        </motion.div>
                        <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-orange-600">
                            Cerveja Virtual
                        </h1>
                        <p className="text-zinc-400 max-w-sm text-lg mb-8">
                            Incline o celular para tomar uma gelada. <br/>
                            <span className="text-sm opacity-70">(Requer acesso ao sensor de movimento)</span>
                        </p>
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={requestAccess}
                            className="px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded-full text-2xl transition-all shadow-[0_0_40px_rgba(245,158,11,0.4)]"
                        >
                            Desce uma Gelada!
                        </motion.button>
                    </motion.div>
                </div>
            ) : (
                <>
                    <canvas 
                        ref={canvasRef} 
                        className="block w-full h-full absolute inset-0 z-10"
                    />
                    
                    {uiVolume < 0.05 && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
                        >
                            <button 
                                onClick={refill}
                                className="pointer-events-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 font-bold rounded-full text-xl flex items-center gap-3 transition-all active:scale-95 shadow-2xl"
                            >
                                <RefreshCcw size={24} /> Mais uma!
                            </button>
                        </motion.div>
                    )}
                    
                    {uiVolume > 0.95 && (
                        <div className="absolute top-12 left-0 right-0 text-center z-30 pointer-events-none opacity-50">
                            <p className="text-white/70 font-medium tracking-widest uppercase text-sm">Incline para beber</p>
                        </div>
                    )}
                </>
            )}

            <button
                onClick={handleShare}
                className="absolute top-6 right-6 z-50 p-3 bg-[#25D366] hover:bg-[#1ebd57] text-white rounded-full shadow-[0_0_15px_rgba(37,211,102,0.3)] transition-all active:scale-95 flex items-center justify-center"
                title="Compartilhar no WhatsApp"
            >
                <Share2 size={24} />
            </button>
        </div>
    );
}
