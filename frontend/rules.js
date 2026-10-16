import { t } from './i18n.js';

const coreFields = ['cross1', 'cross2', 'duration1', 'bombSource', 'element1', 'chaos1', 'chaos2'];
const floodFields = ['flood', 'fate'];
const magicFields = ['thunder', 'ice', 'releaseThunder', 'releaseIce'];

// null means not recorded. Never guess a mechanic from an unset input.
export function initialState() {
  return Object.fromEntries([...coreFields, ...floodFields, ...magicFields].map(key => [key, null]));
}

export function activeFields({ enableFlood = true, enableMagic = true } = {}) {
  return [...coreFields, ...(enableFlood ? floodFields : []), ...(enableMagic ? magicFields : [])];
}

// Cast 1 may give fire or water. Resolution order is always fire, then water.
export function linkedMechanics(state) {
  let fire = null;
  let water = null;
  let element2 = null;
  if (state.element1 != null) {
    const firstIsFire = state.element1 === 'fire';
    fire = firstIsFire ? state.chaos1 : state.chaos2;
    water = firstIsFire ? state.chaos2 : state.chaos1;
    element2 = firstIsFire ? 'water' : 'fire';
  }

  let duration2 = null;
  if (state.duration1 != null) {
    duration2 = state.duration1 === 'short' ? 'long' : 'short';
  }
  return { duration2, element2, fire, water };
}

export function waterLightning(truth) {
  return t(truth == null ? 'rule.wl.pending' : 'rule.wl.' + truth);
}

export function gaze(truth) {
  return t(truth == null ? 'rule.wl.pending' : 'rule.gaze.' + truth);
}

export function bomb(truth) {
  return t(truth == null ? 'rule.bomb.pending' : 'rule.bomb.' + truth);
}

export function personalBomb(state) {
  return bomb(state.bombSource == null ? null : state['cross' + state.bombSource]);
}

export function flood(truth, fate) {
  if (truth == null || fate == null) return t('rule.flood.pending');
  const action = t(truth === (fate === 'death') ? 'rule.flood.same' : 'rule.flood.opposite');
  return t('rule.flood.result', { action });
}

export function magic(stored, released, shape) {
  const label = ['line', 'fan'].includes(shape) ? t('shape.' + shape) : shape;
  if (stored == null || released == null) return t('rule.magic.pending', { shape: label });
  const side = t(stored === released ? 'shape.outside' : 'shape.inside');
  return t('rule.magic.result', { shape: label, side });
}

const storedMagic = (value, shape) => magic(value, true, shape);

// Detailed reference timeline; the compact overlay groups it into rounds().
export function timeline(state) {
  const mechanics = resolveMechanics(state);
  const thunder = state.thunder == null ? t('timeline.thunder.pending')
    : t('timeline.thunder.safe', { safe: storedMagic(state.thunder, 'line') });
  const ice = state.ice == null ? t('timeline.ice.pending')
    : t('timeline.ice.safe', { safe: storedMagic(state.ice, 'fan') });
  return [
    {
      time: '01:01', title: t('timeline.flood.title'),
      main: flood(state.flood, state.fate), note: t('timeline.flood.note'),
    },
    {
      time: '01:09', title: t('timeline.short.title'), main: waterAction(state, mechanics.shortWater),
      note: t('timeline.short.note', { bomb: personalBomb(state) }),
    },
    {
      time: '01:17', title: t('timeline.thunder.title'), main: gaze(state.cross1),
      note: t('timeline.thunder.note', { thunder }),
    },
    {
      time: '01:24', title: t('timeline.fire.title'),
      main: chaosAction('fire', mechanics.fire),
      note: t('timeline.fire.note'),
    },
    {
      time: '01:34', title: t('timeline.long.title'),
      main: waterAction(state, mechanics.longWater), note: ice + personalBomb(state),
    },
    {
      time: '01:42', title: t('timeline.gaze.title'),
      main: gaze(state.cross2), note: t('timeline.gaze.note'),
    },
    {
      time: '01:47', title: t('timeline.water.title'),
      main: chaosAction('water', mechanics.water),
      note: t('timeline.release.note', {
        line: magic(state.thunder, state.releaseThunder, 'line'),
        fan: magic(state.ice, state.releaseIce, 'fan'),
      }),
    },
  ];
}

// Truth labels follow the same source mapping as the actions below. A missing
// duration/type cannot be used to guess which Grand Cross/Chaos supplied a buff.
function resolveMechanics(state) {
  const { fire, water } = linkedMechanics(state);
  let shortWater = null;
  let longWater = null;
  if (state.duration1 != null) {
    const firstIsShort = state.duration1 === 'short';
    shortWater = firstIsShort ? state.cross1 : state.cross2;
    longWater = firstIsShort ? state.cross2 : state.cross1;
  }
  const bombTruth = state.bombSource == null ? null : state['cross' + state.bombSource];
  return { fire, water, shortWater, longWater, bombTruth };
}

function waterAction(state, truth) {
  return state.duration1 == null ? t('rule.duration.pending') : waterLightning(truth);
}

function chaosAction(element, truth) {
  return t(truth == null ? 'rule.chaos.pending' : 'rule.' + element + '.' + truth);
}

function storedMagicHint(value, shape, element) {
  const description = value == null
    ? t('round.' + element + '.pending')
    : t('round.' + element + '.safe', { safe: storedMagic(value, shape) });
  return ' · ' + description;
}

export function truthLabel(value) {
  return t(value == null ? 'result.unrecorded' : value ? 'choice.true' : 'choice.false');
}

function truthSummary(entries) {
  return entries.map(([label, value]) =>
    t('result.truth', { label: t('result.' + label), truth: truthLabel(value) }),
  ).join(' · ');
}

export function rounds(state, { enableMagic = true } = {}) {
  const mechanics = resolveMechanics(state);
  const action = personalBomb(state);
  const firstTruth = [['shortWater', mechanics.shortWater], ['gaze1', state.cross1], ['bomb', mechanics.bombTruth]];
  const thirdTruth = [['longWater', mechanics.longWater], ['gaze2', state.cross2], ['bomb', mechanics.bombTruth]];
  let thunder = '';
  let ice = '';
  // Disabled optional modules must not even read the saved magic values.
  if (enableMagic) {
    firstTruth.push(['storedThunder', state.thunder]);
    thirdTruth.push(['storedIce', state.ice]);
    thunder = storedMagicHint(state.thunder, 'line', 'thunder');
    ice = storedMagicHint(state.ice, 'fan', 'ice');
  }

  const result = [
    {
      title: t('round.1'), time: '01:09—01:18',
      truth: truthSummary(firstTruth),
      main: waterAction(state, mechanics.shortWater) + ' · ' + action + thunder,
      note: gaze(state.cross1),
    },
    {
      title: t('round.2'), time: '01:24—01:29',
      truth: truthSummary([['shortFire', mechanics.fire]]),
      main: chaosAction('fire', mechanics.fire),
      note: '',
    },
    {
      title: t('round.3'), time: '01:34—01:42',
      truth: truthSummary(thirdTruth),
      main: waterAction(state, mechanics.longWater) + ' · ' + action + ice,
      note: gaze(state.cross2),
    },
    {
      title: t('round.4'), time: '01:47—01:52',
      truth: truthSummary([['longWaterChaos', mechanics.water]]),
      main: chaosAction('water', mechanics.water),
      note: '',
    },
  ];
  if (enableMagic) {
    result.push({
      title: t('round.5'), time: '01:53',
      truth: truthSummary([['releasedThunder', state.releaseThunder], ['releasedIce', state.releaseIce]]),
      main: magic(state.thunder, state.releaseThunder, 'line') + ' ＋ ' + magic(state.ice, state.releaseIce, 'fan'),
      note: t('round.release.note'),
    });
  }
  return result;
}
