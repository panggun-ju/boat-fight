export class SpriteAnimation {
    constructor(frames, frameDuration = 0.1) {
        this.frames = frames;
        this.frameDuration = frameDuration;
    }
    
    getFrame(time) {
        if (!this.frames || this.frames.length === 0) return null;
        const index = Math.floor(time / this.frameDuration) % this.frames.length;
        return this.frames[index];
    }
}

// 제공된 이미지(sprites.jpg) 기반 대략적인 좌표 매핑
// 사용 환경에 맞게 픽셀 좌표(x, y, w, h)를 미세 조정해야 완벽하게 맞습니다.
export const SpriteData = {
    player: {
        idle: new SpriteAnimation([{x: 20, y: 140, w: 130, h: 100}], 1),
        rowing: new SpriteAnimation([
            {x: 20, y: 260, w: 130, h: 100},
            {x: 170, y: 260, w: 130, h: 100},
            {x: 320, y: 260, w: 130, h: 100},
            {x: 470, y: 260, w: 130, h: 100}
        ], 0.15),
        attacking: new SpriteAnimation([
            {x: 20, y: 380, w: 130, h: 100},
            {x: 170, y: 380, w: 130, h: 100},
            {x: 320, y: 380, w: 130, h: 100}
        ], 0.1),
        blocking: new SpriteAnimation([
            {x: 20, y: 500, w: 130, h: 100},
            {x: 170, y: 500, w: 130, h: 100},
            {x: 320, y: 500, w: 130, h: 100}
        ], 0.1),
        stunned: new SpriteAnimation([{x: 20, y: 620, w: 130, h: 100}], 1),
        hit: new SpriteAnimation([
            {x: 20, y: 620, w: 130, h: 100},
            {x: 170, y: 620, w: 130, h: 100}
        ], 0.1),
        dead: new SpriteAnimation([{x: 20, y: 740, w: 130, h: 100}], 1)
    },
    enemy: {
        idle: new SpriteAnimation([{x: 820, y: 140, w: 130, h: 100}], 1),
        approach: new SpriteAnimation([{x: 820, y: 140, w: 130, h: 100}], 1),
        rowing: new SpriteAnimation([
            {x: 820, y: 140, w: 130, h: 100},
            {x: 970, y: 140, w: 130, h: 100},
            {x: 1120, y: 140, w: 130, h: 100},
            {x: 1270, y: 140, w: 130, h: 100}
        ], 0.15),
        telegraphing: new SpriteAnimation([
            {x: 820, y: 260, w: 130, h: 100},
            {x: 970, y: 260, w: 130, h: 100},
            {x: 1120, y: 260, w: 130, h: 100}
        ], 0.1),
        attacking: new SpriteAnimation([
            {x: 820, y: 380, w: 130, h: 100},
            {x: 970, y: 380, w: 130, h: 100},
            {x: 1120, y: 380, w: 130, h: 100}
        ], 0.1),
        stunned: new SpriteAnimation([
            {x: 820, y: 500, w: 130, h: 100},
            {x: 970, y: 500, w: 130, h: 100}
        ], 0.2),
        hit: new SpriteAnimation([{x: 1120, y: 500, w: 130, h: 100}], 1),
        dead: new SpriteAnimation([{x: 820, y: 620, w: 130, h: 100}], 1)
    },
    effects: {
        playerSlash: {x: 820, y: 740, w: 150, h: 150},
        enemySlash: {x: 1000, y: 740, w: 150, h: 150},
        waterWake: {x: 820, y: 900, w: 100, h: 100}
    }
};
