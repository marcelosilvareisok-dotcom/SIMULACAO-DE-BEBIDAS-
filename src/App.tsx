/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Beer, RefreshCcw, Share2 } from 'lucide-react';

const WARNINGS = [
    "Beba com moderação e se beber não dirija! 🚗🚫",
    "Proibido venda para menores de 18 anos. 🔞",
    "Bebidas viciam. Consuma com responsabilidade.",
    "Se divirta 😃🍻"
];

class Bubble {
    x: number;
    y: number;
    radius: number;
    speed: number;
    wobble: number;
    wobbleSpeed: number;
    opacity: number;

    constructor(W: number, H: number) {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.radius = Math.random() * 6 + 2;
        this.speed = Math.random() * 5 + 2;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.1 + 0.02;
        this.opacity = Math.random() * 0.5 + 0.2;
    }

    update(W: number, H: number, surface: number[][], V: number) {
        this.y -= this.speed;
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 1.5;

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

        if (this.y < surfaceY || V <= 0) {
            this.y = H + Math.random() * 100;
            this.x = Math.random() * W;
            this.radius = Math.random() * 6 + 2;
            this.speed = Math.random() * 5 + 2;
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity + 0.3})`;
        ctx.fill();
    }
}

class SoundEngine {
    ctx: AudioContext | null = null;
    isDrinking = false;
    noiseSource: AudioBufferSourceNode | null = null;
    filter: BiquadFilterNode | null = null;
    lfo: OscillatorNode | null = null;
    drinkGain: GainNode | null = null;

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playShare() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playGulp() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.6, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playRefill() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(4000, this.ctx.currentTime + 0.5);
        filter.Q.value = 5;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }

    startDrinking() {
        if (!this.ctx || this.isDrinking) return;
        this.isDrinking = true;

        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseSource = this.ctx.createBufferSource();
        this.noiseSource.buffer = buffer;
        this.noiseSource.loop = true;

        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 600;

        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 6; 
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 300;
        this.lfo.connect(lfoGain);
        lfoGain.connect(this.filter.frequency);

        this.drinkGain = this.ctx.createGain();
        this.drinkGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.drinkGain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.1);

        this.noiseSource.connect(this.filter);
        this.filter.connect(this.drinkGain);
        this.drinkGain.connect(this.ctx.destination);

        this.noiseSource.start();
        this.lfo.start();
    }

    stopDrinking() {
        if (!this.isDrinking || !this.drinkGain || !this.ctx) return;
        this.isDrinking = false;
        
        this.drinkGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        
        const ns = this.noiseSource;
        const lfo = this.lfo;
        
        setTimeout(() => {
            if (ns) {
                try { ns.stop(); ns.disconnect(); } catch(e){}
            }
            if (lfo) {
                try { lfo.stop(); lfo.disconnect(); } catch(e){}
            }
        }, 150);
        
        this.noiseSource = null;
        this.lfo = null;
        this.drinkGain = null;
    }
}

const soundEngine = new SoundEngine();

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
    const [activeWarning, setActiveWarning] = useState<string | null>(null);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const volumeRef = useRef(1.0);
    const orientationRef = useRef({ beta: 90, gamma: 0 });
    const hasReceivedOrientation = useRef(false);
    const bubblesRef = useRef<Bubble[]>([]);
    const lastGulpVolumeRef = useRef(1.0);
    const foamThicknessRef = useRef(20);
    const lastOrientationRef = useRef({ beta: 90, gamma: 0 });
    const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const requestAccess = async () => {
        soundEngine.init();
        soundEngine.playRefill();
        
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
                    // Shake detection for foam
                    const deltaBeta = Math.abs(beta - lastOrientationRef.current.beta);
                    const deltaGamma = Math.abs(gamma - lastOrientationRef.current.gamma);
                    if (deltaBeta > 2 || deltaGamma > 2) {
                        foamThicknessRef.current = Math.min(60, foamThicknessRef.current + (deltaBeta + deltaGamma) * 0.8);
                    }
                    
                    ctx.beginPath();
                    ctx.moveTo(surface[0][0], surface[0][1]);
                    ctx.lineTo(surface[1][0], surface[1][1]);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.lineWidth = foamThicknessRef.current;
                    ctx.lineCap = 'round';
                    ctx.stroke();

                    const foamBubblesCount = Math.floor(W / 15);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    for (let i = 0; i <= foamBubblesCount; i++) {
                        const t = i / foamBubblesCount;
                        const fx = surface[0][0] + t * (surface[1][0] - surface[0][0]);
                        const fy = surface[0][1] + t * (surface[1][1] - surface[0][1]);
                        
                        const radius = (foamThicknessRef.current / 2) + Math.random() * 8;
                        const offsetY = (Math.random() - 0.5) * (foamThicknessRef.current * 0.5);
                        
                        ctx.beginPath();
                        ctx.arc(fx, fy + offsetY, radius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            foamThicknessRef.current = Math.max(20, foamThicknessRef.current - 0.5);
            lastOrientationRef.current = { beta, gamma };

            // Glass Vector Overlay
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(0, 0, 24, H);
            ctx.fillRect(W - 24, 0, 24, H);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(0, H - 40, W, 40);
            
            const gradientLeft = ctx.createLinearGradient(0, 0, 80, 0);
            gradientLeft.addColorStop(0, 'rgba(255,255,255,0.3)');
            gradientLeft.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradientLeft;
            ctx.fillRect(24, 0, 56, H);

            const gradientRight = ctx.createLinearGradient(W - 80, 0, W, 0);
            gradientRight.addColorStop(0, 'rgba(255,255,255,0)');
            gradientRight.addColorStop(1, 'rgba(255,255,255,0.15)');
            ctx.fillStyle = gradientRight;
            ctx.fillRect(W - 80, 0, 56, H);

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
                soundEngine.startDrinking();
                
                if (lastGulpVolumeRef.current - volumeRef.current > 0.15) {
                    soundEngine.playGulp();
                    lastGulpVolumeRef.current = volumeRef.current;
                    
                    const randomWarning = WARNINGS[Math.floor(Math.random() * WARNINGS.length)];
                    setActiveWarning(randomWarning);
                    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
                    warningTimeoutRef.current = setTimeout(() => setActiveWarning(null), 3500);
                }
            } else {
                soundEngine.stopDrinking();
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
        lastGulpVolumeRef.current = 1.0;
        setUiVolume(1.0);
        soundEngine.playRefill();
    };

    const handleShare = () => {
        soundEngine.playShare();
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

                    <AnimatePresence>
                        {activeWarning && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="absolute bottom-24 left-0 right-0 flex justify-center z-50 pointer-events-none px-6"
                            >
                                <div className="bg-black/70 backdrop-blur-md text-white/90 px-6 py-3 rounded-2xl text-sm font-medium border border-white/10 shadow-2xl text-center max-w-sm">
                                    {activeWarning}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}

            <button
                onClick={handleShare}
                className="absolute top-6 right-6 z-50 p-3 bg-[#25D366] hover:bg-[#1ebd57] text-white rounded-full shadow-[0_0_15px_rgba(37,211,102,0.3)] transition-all active:scale-95 flex items-center justify-center"
                title="Compartilhar no WhatsApp"
            >
                <Share2 size={24} />
            </button>

            <motion.a
                href="https://wa.me/5594991233751"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-6 left-6 z-50 p-4 bg-[#25D366] text-white rounded-full shadow-[0_0_20px_rgba(37,211,102,0.6)] flex items-center justify-center"
                animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                        "0 0 10px rgba(37, 211, 102, 0.4)",
                        "0 0 25px rgba(37, 211, 102, 0.8)",
                        "0 0 10px rgba(37, 211, 102, 0.4)"
                    ]
                }}
                transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                title="Falar com o Desenvolvedor"
            >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.549 4.142 1.594 5.945L0 24l6.334-1.652a11.844 11.844 0 0 0 5.721 1.458h.007c6.555 0 11.89-5.335 11.894-11.893a11.81 11.81 0 0 0-3.48-8.396"/>
                </svg>
            </motion.a>
        </div>
    );
}
