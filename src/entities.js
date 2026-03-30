import { Vec2 } from './math.js';
import { InputState } from './input.js';
import { SlashArc } from './combat.js';
import { SpriteData } from './sprite.js';
import { AudioSys } from './audio.js';

// 보트의 공통 상태 머신
export const BoatState = {
    IDLE: 'idle',
    ROWING: 'rowing',
    ATTACKING: 'attacking',
    BLOCKING: 'blocking',
    STUNNED: 'stunned',
    DEAD: 'dead'
};

export class Boat {
    constructor(x, y) {
        this.pos = new Vec2(x, y);
        this.vel = new Vec2(0, 0);
        this.angle = -Math.PI / 2; // 초기 방향: 위쪽(북쪽)
        this.angularVel = 0;

        // 물리 상수
        this.WATER_DRAG = 2.5;     // 물의 마찰력 (선형)
        this.ANGULAR_DRAG = 4.0;   // 회전 마찰력
        this.MAX_SPEED = 250;      // 최대 속도

        this.state = BoatState.IDLE;
        
        // 크기 (렌더링용 임시) - 0.75배 축소
        this.width = 22.5;
        this.height = 45;
        
        this.animTime = 0;
    }

    // 보트가 바라보는 전방 벡터
    getForwardVec() {
        return new Vec2(Math.cos(this.angle), Math.sin(this.angle));
    }

    // 보트의 측면 벡터 (우측)
    getRightVec() {
        return new Vec2(Math.cos(this.angle + Math.PI/2), Math.sin(this.angle + Math.PI/2));
    }

    applyForce(forceVec) {
        this.vel = this.vel.add(forceVec);
    }

    applyTorque(torque) {
        this.angularVel += torque;
    }

    updatePhysics(dt, width, height) {
        this.animTime += dt;
        
        // 전방과 측면 속도를 분리하여 측면 마찰력을 더 크게 적용 (Anisotropic Drag)
        const forward = this.getForwardVec();
        const right = this.getRightVec();
        
        let forwardVel = this.vel.dot(forward);
        let rightVel = this.vel.dot(right);
        
        // 물의 마찰력 적용 (감속)
        forwardVel *= (1 - Math.min(1, this.WATER_DRAG * dt));
        rightVel *= (1 - Math.min(1, this.WATER_DRAG * 4.0 * dt)); // 측면 마찰은 4배로 강하게
        
        this.vel = forward.scale(forwardVel).add(right.scale(rightVel));
        this.angularVel *= (1 - Math.min(1, this.ANGULAR_DRAG * dt));

        // 최대 속도 제한
        if (this.vel.mag() > this.MAX_SPEED) {
            this.vel = this.vel.normalize().scale(this.MAX_SPEED);
        }

        // 위치 및 각도 업데이트
        this.pos = this.pos.add(this.vel.scale(dt));
        this.angle += this.angularVel * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        this.drawBoat(ctx);

        ctx.restore();
    }

    drawBoat(ctx) {
        // 배 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(8, 8, this.height/2 + 2, this.width/2 + 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 배 몸체 (나무 질감 느낌의 그라데이션)
        const gradient = ctx.createLinearGradient(-this.height/2, 0, this.height/2, 0);
        if (this instanceof Enemy) {
            gradient.addColorStop(0, '#3a0f0f');
            gradient.addColorStop(0.5, '#8b2b2b');
            gradient.addColorStop(1, '#5c1a1a');
        } else {
            gradient.addColorStop(0, '#3a2110');
            gradient.addColorStop(0.5, '#8b5a2b');
            gradient.addColorStop(1, '#5c3a21');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        // 앞은 뾰족하게, 뒤는 둥글게
        ctx.moveTo(this.height/2 + 12, 0); // 뱃머리
        ctx.quadraticCurveTo(this.height/4, this.width/2 + 6, -this.height/2, this.width/2);
        ctx.quadraticCurveTo(-this.height/2 - 12, 0, -this.height/2, -this.width/2);
        ctx.quadraticCurveTo(this.height/4, -this.width/2 - 6, this.height/2 + 12, 0);
        ctx.fill();

        // 배 테두리 (입체감)
        ctx.strokeStyle = this instanceof Enemy ? '#2a0a0a' : '#2a1505';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // 배 안쪽 테두리 (갑판 느낌)
        ctx.strokeStyle = this instanceof Enemy ? '#5c1a1a' : '#a67c52';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 배 내부 (앉는 곳)
        ctx.fillStyle = '#2a1a10';
        ctx.beginPath();
        ctx.ellipse(-2, 0, this.height/2.5, this.width/2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 나무 판자 디테일 (가로선)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for(let i = -10; i <= 10; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, -this.width/3);
            ctx.lineTo(i, this.width/3);
            ctx.stroke();
        }

        // 플레이어/적 구분 마커 (투구 느낌)
        ctx.fillStyle = this instanceof Enemy ? '#ff3333' : '#33ff33';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        // 투구 하이라이트
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-2, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 무기 크기 스케일 (아이템 적용 + 기본 0.75배 축소)
        const oarScale = (this.oarScale || 1.0) * 0.75;
        const swordScale = (this.swordScale || 1.0) * 0.75;

        if (this.holdingSword) {
            ctx.save();
            // 칼은 무조건 배의 정면 (또는 특정 상태에 따른 swordAngle) 방향으로 고정
            ctx.rotate(this.swordAngle || 0);
            
            // 찌르기 오프셋 적용
            if (this.swordOffset) {
                ctx.translate(this.swordOffset, 0);
            }
            
            // 칼날 (은색)
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 6 * swordScale;
            ctx.lineCap = 'round';
            ctx.beginPath(); 
            ctx.moveTo(0, 0); 
            ctx.lineTo(45 * swordScale, 0); 
            ctx.stroke();
            
            // 손잡이 (갈색)
            ctx.strokeStyle = '#8b5a2b';
            ctx.lineWidth = 8 * swordScale;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(12 * swordScale, 0);
            ctx.stroke();
            
            // 코등이 (금색)
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4 * swordScale;
            ctx.beginPath();
            ctx.moveTo(12 * swordScale, -10 * swordScale);
            ctx.lineTo(12 * swordScale, 10 * swordScale);
            ctx.stroke();
            
            ctx.restore();
        } else {
            if (this instanceof Enemy) {
                // 적은 양쪽에 노를 가짐
                ctx.strokeStyle = '#c49363';
                ctx.lineWidth = 4 * oarScale;
                ctx.lineCap = 'round';
                
                let oarAngle = 0;
                if (this.state === BoatState.ROWING) {
                    oarAngle = Math.sin(this.animTime * 15) * 0.6;
                }
                
                ctx.save();
                ctx.translate(0, -this.width/2.5);
                ctx.rotate(oarAngle);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15 * oarScale, -28 * oarScale); ctx.stroke();
                ctx.fillStyle = '#a67c52';
                ctx.beginPath(); ctx.ellipse(-18 * oarScale, -32 * oarScale, 5 * oarScale, 10 * oarScale, Math.PI/4, 0, Math.PI*2); ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.translate(0, this.width/2.5);
                ctx.rotate(-oarAngle);
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15 * oarScale, 28 * oarScale); ctx.stroke();
                ctx.fillStyle = '#a67c52';
                ctx.beginPath(); ctx.ellipse(-18 * oarScale, 32 * oarScale, 5 * oarScale, 10 * oarScale, -Math.PI/4, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            } else {
                // 플레이어는 마우스를 향하는 단일 노를 가짐 (쌍발 노 아이템 획득 시 양쪽)
                ctx.strokeStyle = '#c49363';
                ctx.lineWidth = 4 * oarScale;
                ctx.lineCap = 'round';
                
                if (this.hasTwinOars) {
                    let oarAngle = 0;
                    if (this.state === BoatState.ROWING) {
                        oarAngle = Math.sin(this.animTime * 15) * 0.6;
                    }
                    ctx.save();
                    ctx.rotate(this.localOarAngle || 0);
                    
                    ctx.save();
                    ctx.translate(0, -this.width/3);
                    ctx.rotate(-oarAngle);
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30 * oarScale, -10 * oarScale); ctx.stroke();
                    ctx.fillStyle = '#a67c52';
                    ctx.beginPath(); ctx.ellipse(35 * oarScale, -12 * oarScale, 8 * oarScale, 4 * oarScale, -Math.PI/8, 0, Math.PI*2); ctx.fill();
                    ctx.restore();

                    ctx.save();
                    ctx.translate(0, this.width/3);
                    ctx.rotate(oarAngle);
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30 * oarScale, 10 * oarScale); ctx.stroke();
                    ctx.fillStyle = '#a67c52';
                    ctx.beginPath(); ctx.ellipse(35 * oarScale, 12 * oarScale, 8 * oarScale, 4 * oarScale, Math.PI/8, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                    
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.rotate(this.localOarAngle || 0);
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30 * oarScale, 0); ctx.stroke();
                    ctx.fillStyle = '#a67c52';
                    ctx.beginPath(); ctx.ellipse(35 * oarScale, 0, 8 * oarScale, 4 * oarScale, 0, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                }
            }
        }
    }
}

export class Player extends Boat {
    constructor(x, y) {
        super(x, y);
        // 플레이어 전용 속성 추가 가능 (경험치 등)
        this.ROW_THRUST_SCALE = 0.6; // 마우스 델타에 비례한 추진력 (요청에 따라 줄임)
        this.ROW_TORQUE_SCALE = 0.2; // 이동 방향으로 회전하는 토크 강도
        
        // 전투 관련 속성
        this.hp = 5;
        this.maxHp = 5;
        this.SLASH_COOLDOWN = 0.5; // 공격 쿨타임 (초)
        this.SLASH_DURATION = 0.2; // 히트박스 유지 시간 (초)
        this.slashTimer = 0;
        this.currentSlash = null; // 활성화된 SlashArc 객체
        this.wasSlashing = false;
        this.wasBlocking = false;
        this.parryTimer = 0;
        
        this.localOarAngle = 0;

        // 렌더링 색상 오버라이드
        this.color = '#3b8b5a';
    }

    update(dt, inputManager, width, height) {
        // 타이머 감소
        if (this.slashTimer > 0) this.slashTimer -= dt;
        if (this.parryTimer > 0) this.parryTimer -= dt;

        // 공격 유지 시간이 끝났으면 히트박스 제거
        if (this.currentSlash && this.slashTimer < this.SLASH_COOLDOWN - this.SLASH_DURATION) {
            this.currentSlash = null;
        }

        // 마우스를 향하는 노의 각도 계산
        const toMouse = inputManager.mousePos.sub(this.pos);
        let targetOarAngle = toMouse.heading() - this.angle;
        while (targetOarAngle > Math.PI) targetOarAngle -= Math.PI * 2;
        while (targetOarAngle < -Math.PI) targetOarAngle += Math.PI * 2;
        this.localOarAngle = targetOarAngle;
        
        // 노 끝부분(물에 닿는 부분) 위치 계산 (파티클 생성용)
        const oarScale = (this.oarScale || 1.0) * 0.75;
        const oarDist = 35 * oarScale;
        const globalOarAngle = this.angle + this.localOarAngle;
        
        if (this.hasTwinOars) {
            let oarAnimAngle = 0;
            if (this.state === BoatState.ROWING) {
                oarAnimAngle = Math.sin(this.animTime * 15) * 0.6;
            }
            // 왼쪽 노
            const leftAngle = globalOarAngle - oarAnimAngle;
            const leftOffset = new Vec2(Math.cos(globalOarAngle - Math.PI/2), Math.sin(globalOarAngle - Math.PI/2)).scale(this.width/3);
            this.oarBladePos = new Vec2(
                this.pos.x + leftOffset.x + Math.cos(leftAngle) * oarDist,
                this.pos.y + leftOffset.y + Math.sin(leftAngle) * oarDist
            );
            
            // 오른쪽 노
            const rightAngle = globalOarAngle + oarAnimAngle;
            const rightOffset = new Vec2(Math.cos(globalOarAngle + Math.PI/2), Math.sin(globalOarAngle + Math.PI/2)).scale(this.width/3);
            this.oarBladePos2 = new Vec2(
                this.pos.x + rightOffset.x + Math.cos(rightAngle) * oarDist,
                this.pos.y + rightOffset.y + Math.sin(rightAngle) * oarDist
            );
        } else {
            this.oarBladePos = new Vec2(
                this.pos.x + Math.cos(globalOarAngle) * oarDist,
                this.pos.y + Math.sin(globalOarAngle) * oarDist
            );
            this.oarBladePos2 = null;
        }

        // 1. 입력 상태에 따른 상태 머신 전환
        // 단, 쿨타임 중이거나 공격 모션 중에는 다른 행동 전환 제한
        const isAttackingNow = this.slashTimer > this.SLASH_COOLDOWN - this.SLASH_DURATION;
        
        if (isAttackingNow) {
            this.state = BoatState.ATTACKING;
        } else if (inputManager.state === InputState.BLOCKING) {
            this.state = BoatState.BLOCKING;
        } else if (inputManager.state === InputState.SLASHING) {
            this.state = BoatState.ATTACKING;
        } else if (inputManager.state === InputState.ROWING) {
            this.state = BoatState.ROWING;
        } else {
            this.state = BoatState.IDLE;
        }

        // --- 무기 상태 및 각도 설정 ---
        const isSlashingInput = (inputManager.state === InputState.SLASHING);
        const isBlockingInput = (inputManager.state === InputState.BLOCKING);
        
        if (isBlockingInput && !this.wasBlocking) {
            this.parryTimer = 0.4; // 0.4초 패링 윈도우
        }
        this.wasBlocking = isBlockingInput;
        
        // 드래그 벡터 계산
        const dragVec = inputManager.getDragVector();
        const forwardVec = this.getForwardVec();
        
        // 찌르기 준비 상태 판별 (공격 모드 좌클릭 드래그 중이고, 드래그 방향이 배의 정면과 얼추 맞을 때)
        let isPreparingThrust = false;
        if (isSlashingInput && dragVec.magSq() > 100) {
            const dragDir = dragVec.normalize();
            const dot = dragDir.dot(forwardVec);
            if (dot > 0.5) { // 약 60도 이내 (cos 60도 = 0.5)
                isPreparingThrust = true;
            }
        }

        this.holdingSword = inputManager.mode === 'attack' || isBlockingInput;
        
        // 찌르기 애니메이션 오프셋 (칼을 앞으로 뻗는 정도)
        this.swordOffset = 0;
        this.swordAngle = 0; // 기본적으로 정면을 향함

        if (isAttackingNow) {
            // 찌르기 애니메이션: 앞으로 슉 나갔다가 돌아옴
            const progress = 1 - ((this.slashTimer - (this.SLASH_COOLDOWN - this.SLASH_DURATION)) / this.SLASH_DURATION);
            if (progress < 0.3) {
                this.swordOffset = (progress / 0.3) * 40; // 최대 40픽셀 전진
            } else {
                this.swordOffset = (1 - (progress - 0.3) / 0.7) * 40;
            }
            this.swordAngle = 0; // 정면을 향함
        } else if (isBlockingInput) {
            this.swordAngle = Math.PI / 2; // 방어 자세 (가로막기)
            this.swordOffset = 0;
        } else if (isPreparingThrust) {
            this.swordAngle = 0; // 정면을 향함
            this.swordOffset = -10; // 살짝 뒤로 당긴 자세 (준비)
        }

        // --- 공격 발동 로직 ---
        // 좌클릭 드래그를 놓았을 때 (isSlashingInput이 false가 됨), 준비 상태였다면 공격 발동
        if (!isSlashingInput && this.wasPreparingThrust && this.slashTimer <= 0) {
            // 공격 발동!
            this.slashTimer = this.SLASH_COOLDOWN;
            const radius = this.slashRadius || 60;
            // 찌르기 범위 (각도를 좁히고 거리를 약간 늘림)
            this.currentSlash = new SlashArc(this.pos, this.angle, radius + 20, Math.PI / 8); 
            AudioSys.play('player_sword');
        }
        
        this.wasPreparingThrust = isPreparingThrust;


        // 2. 상태에 따른 물리 행동 처리
        // 공격 중(이펙트 유지 중)일 때는 노를 저을 수 없음 (이동 불가 패널티)
        this.isRowingActive = false;
        if (this.state === BoatState.ROWING && !isAttackingNow) {
            const dragVec = inputManager.getDragVector();
            
            if (dragVec.magSq() > 0) {
                this.isRowingActive = true;
                // 드래그 벡터의 반대 방향으로 힘 발생 (물을 미는 반작용)
                const force = dragVec.scale(-this.ROW_THRUST_SCALE);
                this.applyForce(force);

                // 배가 힘을 받는 방향(이동하려는 방향)으로 자연스럽게 회전하도록 토크 적용
                if (force.magSq() > 0.01) {
                    const forceDir = force.normalize();
                    const forward = this.getForwardVec();
                    const alignTorque = forward.cross(forceDir) * this.ROW_TORQUE_SCALE;
                    this.applyTorque(alignTorque);
                }

                // 연속적인 드래그 힘 적용을 위해 시작점을 현재 위치로 갱신 (델타 드래그 방식)
                inputManager.dragStartPos = inputManager.mousePos.clone();
            }
        }

        // 블로킹, 어태킹 중에는 물리적 이동 입력(노 젓기) 불가
        
        // 3. 물리 엔진 틱 (관성에 의한 이동)
        this.updatePhysics(dt, width, height);
    }

    draw(ctx, images) {
        super.draw(ctx, images);

        // 히트박스 렌더링 (월드 좌표계에서 그림)
        if (this.currentSlash) {
            this.currentSlash.draw(ctx, 'rgba(255, 50, 50, 0.4)', null, false);
        }

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        // 상태별 오라 시각화 (임시)
        if (this.state === BoatState.BLOCKING) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.height/2 + 10, this.width/2 + 10, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawFallback(ctx) {
        // 배 몸체
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.height/2, this.width/2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 뱃머리
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.height/2 - 5, 0, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

export const EnemyState = {
    APPROACH: 'approach',
    TELEGRAPHING: 'telegraphing',
    ATTACKING: 'attacking',
    STUNNED: 'stunned'
};

export class Enemy extends Boat {
    constructor(x, y, type = 'normal') {
        super(x, y);
        this.type = type;
        this.aiState = EnemyState.APPROACH;
        
        // 타입별 설정
        if (type === 'swarm') {
            this.color = '#b8860b'; // 황갈색
            this.hp = 1;
            this.maxHp = 1;
            this.attackRange = 50;
            this.TELEGRAPH_DURATION = 0.4;
            this.speedScale = 1.5;
            this.width = 15;
            this.height = 30;
            this.slashRadius = 40;
            this.xpValue = 0.5;
        } else if (type === 'tank') {
            this.color = '#4a0e0e'; // 어두운 붉은색
            this.hp = 8;
            this.maxHp = 8;
            this.attackRange = 80;
            this.TELEGRAPH_DURATION = 1.2;
            this.speedScale = 0.6;
            this.width = 30;
            this.height = 60;
            this.slashRadius = 70;
            this.swordScale = 1.5;
            this.xpValue = 3;
        } else if (type === 'ranged') {
            this.color = '#2b8b8b'; // 청록색 계열
            this.hp = 2;
            this.maxHp = 2;
            this.attackRange = 200; // 원거리 사거리
            this.TELEGRAPH_DURATION = 1.0;
            this.speedScale = 0.8;
            this.width = 20;
            this.height = 40;
            this.xpValue = 1.5;
        } else { // normal
            this.color = '#8b2b2b'; // 붉은색 계열
            this.hp = 3;
            this.maxHp = 3;
            this.attackRange = 60;
            this.TELEGRAPH_DURATION = 0.8;
            this.speedScale = 1.0;
            this.slashRadius = 55;
            this.xpValue = 1;
        }
        
        // 공격 파라미터
        this.SLASH_DURATION = 0.2;
        this.slashTimer = 0;
        this.currentSlash = null;
        this.stunTimer = 0;
    }

    updateAI(dt, player, width, height) {
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            if (this.stunTimer <= 0) this.aiState = EnemyState.APPROACH;
            else {
                this.state = BoatState.STUNNED;
                this.updatePhysics(dt, width, height);
                return;
            }
        }

        // 공격 히트박스 유지 처리
        if (this.aiState === EnemyState.ATTACKING) {
            if (this.slashTimer > 0) this.slashTimer -= dt;
            if (this.slashTimer <= 0) {
                this.currentSlash = null;
                this.aiState = EnemyState.APPROACH; // 공격 끝나면 다시 접근
            }
        }

        // 무기 상태 및 각도 설정
        this.holdingSword = (this.aiState === EnemyState.TELEGRAPHING || this.aiState === EnemyState.ATTACKING);
        this.swordOffset = 0;
        
        if (this.aiState === EnemyState.TELEGRAPHING) {
            this.swordAngle = 0; // 정면
            this.swordOffset = -10; // 공격 준비 (뒤로 당김)
        } else if (this.currentSlash || this.aiState === EnemyState.ATTACKING) {
            const progress = 1 - (this.slashTimer / this.SLASH_DURATION);
            if (progress < 0.3) {
                this.swordOffset = (progress / 0.3) * 40;
            } else {
                this.swordOffset = (1 - (progress - 0.3) / 0.7) * 40;
            }
            this.swordAngle = 0; // 찌르기
        }

        const distToPlayer = Vec2.distance(this.pos, player.pos);

        if (this.aiState === EnemyState.APPROACH) {
            this.state = BoatState.ROWING;
            
            // 플레이어를 향하는 방향 벡터
            const dirToPlayer = player.pos.sub(this.pos).normalize();
            const forward = this.getForwardVec();
            
            // 전진 추력 (하향)
            this.applyForce(forward.scale(40 * this.speedScale * dt)); // 적 속도 더 감소

            // 방향 회전 (외적을 이용해 목표를 향해 돌림)
            const cross = forward.cross(dirToPlayer);
            this.applyTorque(cross * 8 * this.speedScale * dt);

            // 사거리에 들어오면 공격 준비
            if (distToPlayer < this.attackRange) {
                this.aiState = EnemyState.TELEGRAPHING;
                this.telegraphTimer = this.TELEGRAPH_DURATION;
                this.state = BoatState.IDLE; // 공격 전조 중엔 멈춤
            }
        } 
        else if (this.aiState === EnemyState.TELEGRAPHING) {
            this.state = BoatState.IDLE;
            this.telegraphTimer -= dt;
            
            // 공격 예고 중에도 방향은 플레이어를 향하도록 살짝 보정 가능
            const dirToPlayer = player.pos.sub(this.pos).normalize();
            const forward = this.getForwardVec();
            const cross = forward.cross(dirToPlayer);
            this.applyTorque(cross * 5 * dt);

            if (this.telegraphTimer <= 0) {
                // 공격 발동!
                this.aiState = EnemyState.ATTACKING;
                this.state = BoatState.ATTACKING;
                this.slashTimer = this.SLASH_DURATION;
                
                if (this.type === 'ranged') {
                    // 원거리 공격 (투사체 발사)
                    if (this.onFireProjectile) {
                        const dir = player.pos.sub(this.pos).normalize();
                        this.onFireProjectile(this.pos.x, this.pos.y, dir, 300, 1);
                        AudioSys.play('enemy_cannon');
                    }
                } else {
                    // 근거리 공격 (부채꼴)
                    const radius = this.slashRadius || 55;
                    this.currentSlash = new SlashArc(this.pos, this.angle, radius, Math.PI / 6);
                    if (this.type === 'swarm') {
                        AudioSys.play('enemy_swarm_sword');
                    } else if (this.type === 'tank') {
                        AudioSys.play('enemy_tank_sword');
                    } else {
                        AudioSys.play('enemy_sword');
                    }
                }
            }
        }

        this.updatePhysics(dt, width, height);
    }

    draw(ctx, images) {
        super.draw(ctx, images);

        if (this.currentSlash) {
            this.currentSlash.draw(ctx, 'rgba(255, 100, 0, 0.6)', null, true);
        }

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);

        // 공격 예고(Telegraphing) 시각화: 붉게 깜빡임
        if (this.aiState === EnemyState.TELEGRAPHING) {
            const blinkRate = 15;
            if (Math.floor(this.telegraphTimer * blinkRate) % 2 === 0) {
                ctx.beginPath();
                ctx.ellipse(0, 0, this.height/2 + 5, this.width/2 + 5, 0, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
        ctx.restore();

        // 체력바 그리기
        if (this.hp < this.maxHp) {
            const barWidth = 30;
            const barHeight = 4;
            const hpRatio = Math.max(0, this.hp / this.maxHp);
            
            ctx.save();
            ctx.translate(this.pos.x, this.pos.y - this.height/2 - 15);
            
            // 배경
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-barWidth/2, -barHeight/2, barWidth, barHeight);
            
            // 체력
            ctx.fillStyle = this.hp > this.maxHp * 0.5 ? '#33ff33' : (this.hp > this.maxHp * 0.2 ? '#ffff33' : '#ff3333');
            ctx.fillRect(-barWidth/2, -barHeight/2, barWidth * hpRatio, barHeight);
            
            // 테두리
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(-barWidth/2, -barHeight/2, barWidth, barHeight);
            
            ctx.restore();
        }
    }

    drawFallback(ctx) {
        // 공격 예고(Telegraphing) 시각화: 붉게 깜빡임
        let drawColor = this.color;
        if (this.aiState === EnemyState.TELEGRAPHING) {
            const blinkRate = 15; // 깜빡임 속도
            if (Math.floor(this.telegraphTimer * blinkRate) % 2 === 0) {
                drawColor = '#ff5555';
            }
        } else if (this.state === BoatState.STUNNED) {
            drawColor = '#555555'; // 기절 시 회색
        }

        // 배 몸체
        ctx.fillStyle = drawColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.height/2, this.width/2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 뱃머리
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.height/2 - 5, 0, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class Projectile {
    constructor(x, y, dir, speed, damage, isEnemy = true) {
        this.pos = new Vec2(x, y);
        this.vel = dir.normalize().scale(speed);
        this.damage = damage;
        this.isEnemy = isEnemy;
        this.radius = 5;
        this.life = 3.0; // 3초 후 소멸
    }

    update(dt) {
        this.pos = this.pos.add(this.vel.scale(dt));
        this.life -= dt;
    }

    draw(ctx) {
        ctx.fillStyle = this.isEnemy ? '#ff5555' : '#55ff55';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
