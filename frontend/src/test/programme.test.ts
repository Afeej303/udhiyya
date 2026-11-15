import { describe, expect, it } from 'vitest';
import { canAccessDashboard, countdownValues, programme } from '@/lib/programme';
describe('Programme template rules',()=>{
 it('does not assign an Eid date',()=>expect(programme.eidDate).toBeNull());
 it('does not show fabricated countdown numbers',()=>expect(countdownValues(null)).toEqual(['—','—','—','—']));
 it('blocks the personal dashboard without a participant session',()=>expect(canAccessDashboard(null)).toBe(false));
 it('allows the dashboard after demo participant entry',()=>expect(canAccessDashboard({name:'Test Participant',email:'participant@example.com',activity:'Creative showcase'})).toBe(true));
});
