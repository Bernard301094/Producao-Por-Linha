const fs = require('fs');
const path = require('path');

const appPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// The replacement deleted ShiftCheckResult partially and isShiftAllowed fully!
// Let's replace the corrupted block.
const regex = /export type ShiftCheckResult = {[\s\S]*?reason: `Fora do horário[\s\S]*?};/m;

const correctCode = `export type ShiftCheckResult = { 
  allowed: boolean; 
  reason?: string; 
  toleranceApplied?: boolean;
  activeTurno: string;
  shiftCycleId?: string;
  toleranceExpiresAt?: number;
};

export function isShiftAllowed(profile: string): ShiftCheckResult {
  const now = getServerTime();
  const activeTurno = getActiveTurno(now);
  
  const normalizedProfile = (profile || '').replace('Turno ', '');
  const normalizedActive = (activeTurno || '').replace('Turno ', '');

  if (normalizedProfile === 'Supervisor' || normalizedProfile === 'Treinamento') {
      return { allowed: true, activeTurno, shiftCycleId: getShiftCycleId(now) };
  }

  if (normalizedProfile === normalizedActive) {
      return { allowed: true, activeTurno, shiftCycleId: getShiftCycleId(now) };
  }
  
  // Check Tolerance
  const pastToleranceTime = new Date(now.getTime() - SHIFT_TOLERANCE_MINUTES * 60000);
  const futureToleranceTime = new Date(now.getTime() + SHIFT_TOLERANCE_MINUTES * 60000);
  
  const activeInPast = getActiveTurno(pastToleranceTime).replace('Turno ', '');
  const activeInFuture = getActiveTurno(futureToleranceTime).replace('Turno ', '');
  
  if (normalizedProfile === activeInPast) {
      const h = now.getHours();
      const expirationDate = new Date(now.getTime());
      if (h >= 18 || h < 6) {
          expirationDate.setHours(18, SHIFT_TOLERANCE_MINUTES, 0, 0);
      } else {
          expirationDate.setHours(6, SHIFT_TOLERANCE_MINUTES, 0, 0);
      }
      return { allowed: true, toleranceApplied: true, activeTurno, shiftCycleId: getShiftCycleId(pastToleranceTime), toleranceExpiresAt: expirationDate.getTime() };
  }
  
  if (normalizedProfile === activeInFuture) {
      return { allowed: true, toleranceApplied: true, activeTurno, shiftCycleId: getShiftCycleId(futureToleranceTime) };
  }

  const outSince = format(now.getHours() >= 18 || now.getHours() < 6 ? new Date(now.setHours(18,0,0,0)) : new Date(now.setHours(6,0,0,0)), 'HH:mm');

  return { 
    allowed: false, 
    activeTurno,
    reason: \`Fora do horário. O turno atual é o \${activeTurno}. Você está fora do horário do seu perfil desde \${outSince}. Se for uma emergência, contate o supervisor.\`
  };
}`;

content = content.replace(regex, correctCode);
fs.writeFileSync(appPath, content);
console.log('Fixed isShiftAllowed');
