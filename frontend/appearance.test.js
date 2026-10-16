import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {t,setLocale} from './i18n.js';
import {defaults,normalisePreferences,validHex} from './preferences.js';
import {initialState,rounds,personalBomb} from './rules.js';

test('translations have identical keys and interpolation parameters',async()=>{
  const zh=JSON.parse(await readFile(new URL('./locales/zh-CN.json',import.meta.url)));
  const en=JSON.parse(await readFile(new URL('./locales/en-US.json',import.meta.url)));
  assert.deepEqual(Object.keys(zh).sort(),Object.keys(en).sort());
  for(const key of Object.keys(zh)){
    const params=value=>[...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
    assert.deepEqual(params(zh[key]),params(en[key]),key);
  }
});
test('switching language translates all five rounds without changing recorded mechanics',()=>{
  const state={...initialState(),cross1:true,cross2:false,duration1:'short',bombSource:1,element1:'fire',chaos1:true,chaos2:false,thunder:true,ice:false,releaseThunder:true,releaseIce:false};
  const before=structuredClone(state);
  setLocale('en-US');
  try{
    const text=rounds(state).flatMap(round=>Object.values(round)).join(' ');
    assert.match(text,/Round 1/);assert.match(text,/Lightning out/);assert.match(text,/Line outside/);
    assert.doesNotMatch(text,/[\p{Script=Han}{}]/u);
    assert.match(personalBomb(state),/Bomb: stay still/);
    assert.equal(t('status.count',{count:3,total:13}),'Recorded 3 / 13 · second cast derived automatically');
    assert.deepEqual(state,before);
  }finally{setLocale('zh-CN');}
});
test('custom colours are validated and corrupt saved settings fall back safely',()=>{
  assert.ok(validHex('#FF0088'));assert.ok(!validHex('red'));assert.ok(!validHex('#123'));
  const settings=normalisePreferences({language:'en-US',background:'#FFFFFF',text:'#000000',accent:'broken'});
  assert.equal(settings.background,'#ffffff');assert.equal(settings.text,'#000000');assert.equal(settings.accent,defaults.accent);
  assert.deepEqual(normalisePreferences(null),defaults);
});
test('optional module flags persist independently of language and colours',()=>{
  const settings=normalisePreferences({...defaults,enableFlood:false,enableMagic:false});
  assert.equal(settings.enableFlood,false);assert.equal(settings.enableMagic,false);
  assert.equal(normalisePreferences({enableFlood:'false'}).enableFlood,defaults.enableFlood);
});


test('font scale preserves old preferences and bounds corrupt saved values', () => {
  assert.equal(normalisePreferences({accent: '#c6a0ff'}).fontScale, 100);
  assert.equal(normalisePreferences({fontScale: 140}).fontScale, 140);
  assert.equal(normalisePreferences({fontScale: 900}).fontScale, 160);
  assert.equal(normalisePreferences({fontScale: -1}).fontScale, 80);
  for (const fontScale of ['140', null, NaN, Infinity]) {
    assert.equal(normalisePreferences({fontScale}).fontScale, 100);
  }
});
