const truthChoices = [[true, 'choice.true'], [false, 'choice.false']];
const bombChoices = [[1, 'choice.yes'], [2, 'choice.no']];

// Each row declares its state key, accessible label, visible label and choices.
export const inputGroups = {
  'cross1-inputs': [
    ['cross1', 'field.cross1', 'short.truth', truthChoices],
    ['duration1', 'field.duration', 'short.duration', [['short', 'choice.short'], ['long', 'choice.long']]],
    ['bombSource', 'field.bomb1', 'short.bomb', bombChoices],
  ],
  'chaos1-inputs': [
    ['chaos1', 'field.chaos1', 'short.truth', truthChoices],
    ['element1', 'field.element', 'short.element', [['fire', 'choice.fire'], ['water', 'choice.water']]],
  ],
  'cross2-inputs': [
    ['cross2', 'field.cross2', 'short.truth', truthChoices],
    ['bombSource', 'field.bomb2', 'short.bomb', [[2, 'choice.yes'], [1, 'choice.no']]],
  ],
  'chaos2-inputs': [['chaos2', 'field.chaos2', 'short.truth', truthChoices]],
  'personal-inputs': [
    ['flood', 'field.flood', 'field.flood', truthChoices],
    ['fate', 'field.fate', 'field.fate', [['death', 'choice.death'], ['domain', 'choice.domain']]],
  ],
  'magic-inputs': ['thunder', 'ice', 'releaseThunder', 'releaseIce'].map(key =>
    [key, 'field.' + key, 'field.' + key, truthChoices]),
};

