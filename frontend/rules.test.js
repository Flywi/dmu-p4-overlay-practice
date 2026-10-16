import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,waterLightning,gaze,bomb,flood,magic,timeline,linkedMechanics,personalBomb,rounds,activeFields} from './rules.js';

test('result truth distinguishes water duration, fixed gaze and personal bomb sources', () => {
  for (const duration1 of ['short', 'long']) {
    for (const bombSource of [1, 2]) {
      const result = rounds({ ...initialState(), cross1: true, cross2: false, duration1, bombSource }, { enableMagic: false });
      const shortTruth = duration1 === 'short' ? '真' : '假';
      const longTruth = duration1 === 'short' ? '假' : '真';
      const bombTruth = bombSource === 1 ? '真' : '假';
      assert.equal(result[0].truth, `短水雷：${shortTruth} · 石化1：真 · 炸弹：${bombTruth}`);
      assert.equal(result[2].truth, `长水雷：${longTruth} · 石化2：假 · 炸弹：${bombTruth}`);
    }
  }
});

test('Chaos result truth follows fire/water type rather than cast order', () => {
  const state = { ...initialState(), chaos1: true, chaos2: false, element1: 'fire' };
  assert.equal(rounds(state)[1].truth, '火：真');
  assert.equal(rounds(state)[3].truth, '水：假');
  state.element1 = 'water';
  assert.equal(rounds(state)[1].truth, '火：假');
  assert.equal(rounds(state)[3].truth, '水：真');
});

test('result truth never guesses missing sources and clears when an input is cancelled', () => {
  const state = { ...initialState(), cross1: true, cross2: false, chaos1: true, chaos2: false };
  const result = rounds(state, { enableMagic: false });
  assert.equal(result[0].truth, '短水雷：未记录 · 石化1：真 · 炸弹：未记录');
  assert.equal(result[2].truth, '长水雷：未记录 · 石化2：假 · 炸弹：未记录');
  assert.equal(result[1].truth, '火：未记录');
  assert.equal(result[3].truth, '水：未记录');
  state.duration1 = 'short';
  state.bombSource = 1;
  state.cross1 = null;
  assert.equal(rounds(state)[0].truth, '短水雷：未记录 · 石化1：未记录 · 炸弹：未记录 · 储雷：未记录');
});

test('optional magic truth distinguishes stored and released observations', () => {
  const state = { ...initialState(), thunder: true, ice: false, releaseThunder: false, releaseIce: true };
  const result = rounds(state);
  assert.match(result[0].truth, /储雷：真$/);
  assert.match(result[2].truth, /储冰：假$/);
  assert.equal(result[4].truth, '放雷：假 · 放冰：真');
  assert.equal(result[4].main, '线内 ＋ 扇内');
  assert.doesNotMatch(rounds(state, { enableMagic: false }).map(round => round.truth).join(' '), /储雷|储冰|放雷|放冰/);
});

test('unset fields never become a guessed safe position',()=>{
  const s=initialState();assert.equal(Object.keys(s).length,13);
  assert.match(timeline(s)[0].main,/记录/);
  assert.match(timeline(s)[1].main,/记录/);
  assert.match(timeline(s)[4].main,/记录/);
  for(const shape of ['线','扇'])assert.match(magic(null,false,shape),/等待/);
});
test('water/lightning, gaze and bomb invert independently',()=>{
  assert.equal(waterLightning(true),'雷出去');
  assert.equal(waterLightning(false),'水出去');
  assert.equal(gaze(true),'石化出');assert.equal(gaze(false),'石化进');
  assert.equal(bomb(true),'炸弹禁止');assert.equal(bomb(false),'炸弹移动');
});
test('all four flood and personal buff combinations',()=>{
  assert.match(flood(true,'death'),/^吃同色/);assert.match(flood(false,'death'),/^吃异色/);
  assert.match(flood(true,'domain'),/^吃异色/);assert.match(flood(false,'domain'),/^吃同色/);
});
test('all 16 stored/released ice and thunder combinations',()=>{
  for(const thunder of [true,false])for(const ice of [true,false])
  for(const releaseThunder of [true,false])for(const releaseIce of [true,false]){
    const s={...initialState(),thunder,ice,releaseThunder,releaseIce};
    const note=timeline(s)[6].note;
    assert.ok(note.includes(thunder===releaseThunder?'线外':'线内'));
    assert.ok(note.includes(ice===releaseIce?'扇外':'扇内'));
  }
});
test('short/long water swaps without swapping fixed gaze rounds',()=>{
  for(const cross1 of [true,false])for(const cross2 of [true,false])for(const duration1 of ['short','long']){
    const s={...initialState(),cross1,cross2,duration1,bombSource:1};
    const t=timeline(s),first=duration1==='short'?cross1:cross2,second=duration1==='short'?cross2:cross1;
    assert.equal(t[1].main,waterLightning(first));assert.equal(t[4].main,waterLightning(second));
    assert.equal(t[2].main,gaze(cross1));assert.equal(t[5].main,gaze(cross2));
    assert.ok(t[1].note.includes(bomb(cross1)));assert.ok(t[4].note.includes(bomb(cross1)));
  }
});
test('personal bomb inherits only the cross that gave it, independently of water duration',()=>{
  for(const cross1 of [true,false])for(const cross2 of [true,false])for(const bombSource of [1,2])for(const duration1 of ['short','long']){
    const s={...initialState(),cross1,cross2,bombSource,duration1};
    const expected=bomb(bombSource===1?cross1:cross2);
    assert.equal(personalBomb(s),expected);
    assert.ok(rounds(s)[0].main.includes(expected));assert.ok(rounds(s)[2].main.includes(expected));
  }
  assert.match(personalBomb(initialState()),/未记录/);
  assert.match(personalBomb({...initialState(),bombSource:1,cross2:true}),/未记录/);
});
test('five rounds group short water and first gaze, fire, long water and second gaze, water, release',()=>{
  const s={...initialState(),cross1:true,cross2:false,duration1:'short',element1:'water',chaos1:true,chaos2:false,bombSource:2,thunder:true,ice:false,releaseThunder:true,releaseIce:false};
  const r=rounds(s);assert.equal(r.length,5);
  assert.deepEqual(r.map(x=>x.title),['第一轮','第二轮','第三轮','第四轮','第五轮']);
  assert.match(r[0].main,/雷出去.*移动.*线外/);assert.equal(r[0].note,'石化出');
  assert.match(r[1].main,/月环/);
  assert.match(r[2].main,/水出去.*移动.*扇内/);assert.equal(r[2].note,'石化进');
  assert.match(r[3].main,/月环/);assert.equal(r[4].main,'线外 ＋ 扇外');
});
test('fire resolves before water regardless of truth',()=>{
  for(const fire of [true,false])for(const water of [true,false])for(const element1 of ['fire','water']){
    const t=timeline({...initialState(),element1,chaos1:element1==='fire'?fire:water,chaos2:element1==='fire'?water:fire});
    assert.match(t[3].main,fire?/^钢铁$/:/^月环$/);
    assert.match(t[6].main,water?/^月环$/:/^钢铁$/);
  }
});
test('second cross duration and second chaos element are derived, not separately editable',()=>{
  const s=initialState();
  assert.equal(linkedMechanics(s).duration2,null);assert.equal(linkedMechanics(s).element2,null);
  s.duration1='long';s.element1='water';
  assert.equal(linkedMechanics(s).duration2,'short');assert.equal(linkedMechanics(s).element2,'fire');
  s.duration1='short';s.element1='fire';
  assert.equal(linkedMechanics(s).duration2,'long');assert.equal(linkedMechanics(s).element2,'water');
  s.duration1=null;s.element1=null;
  assert.equal(linkedMechanics(s).duration2,null);assert.equal(linkedMechanics(s).fire,null);assert.equal(linkedMechanics(s).water,null);
});
test('changing first chaos type remaps both truths to the correct fire/water resolution',()=>{
  const s={...initialState(),element1:'fire',chaos1:true,chaos2:false};
  assert.match(timeline(s)[3].main,/钢铁/);assert.match(timeline(s)[6].main,/钢铁/);
  s.element1='water';
  assert.match(timeline(s)[3].main,/月环/);assert.match(timeline(s)[6].main,/月环/);
});
test('disabled magic is never read or derived and the fifth round is removed',()=>{
  const values={...initialState(),cross1:true,cross2:false,duration1:'short',bombSource:1,element1:'fire',chaos1:true,chaos2:false};
  const guarded=new Proxy(values,{get(target,key){if(['thunder','ice','releaseThunder','releaseIce','flood','fate'].includes(key))throw new Error('Disabled module was read: '+key);return target[key];}});
  const result=rounds(guarded,{enableMagic:false});
  assert.equal(result.length,4);assert.match(result[0].main,/雷出去.*炸弹禁止/);
  assert.match(result[2].main,/水出去.*炸弹禁止/);
  assert.doesNotMatch(result.flatMap(r=>Object.values(r)).join(' '),/线外|扇内|放出|冰待记录|雷待记录/);
  assert.equal(rounds(values,{enableMagic:true}).length,5);
});
test('optional module combinations exclude hidden fields from progress',()=>{
  for(const enableFlood of [true,false])for(const enableMagic of [true,false]){
    const fields=activeFields({enableFlood,enableMagic});
    assert.equal(fields.length,7+(enableFlood?2:0)+(enableMagic?4:0));
    assert.equal(fields.includes('flood'),enableFlood);
    assert.equal(fields.includes('ice'),enableMagic);
    assert.ok(fields.includes('cross1'));
  }
});
