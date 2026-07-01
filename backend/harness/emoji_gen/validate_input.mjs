// 契约 @contracts/ai_emoji_gen.json — 输入校验层
const VALID_STYLES = ['cartoon', 'real_person', 'ink', 'pixel'];

const ERROR = {
  INVALID_INPUT_TYPE:  'INVALID_INPUT_TYPE',
  MISSING_PROMPT:      'MISSING_PROMPT',
  INVALID_STYLE:       'INVALID_STYLE',
  MISSING_USER_ID:     'MISSING_USER_ID',
};

function makeError(code) {
  return { success: false, error_code: code };
}

export function validateInput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return makeError(ERROR.INVALID_INPUT_TYPE);
  }
  if (typeof raw.prompt !== 'string') {
    return makeError(ERROR.MISSING_PROMPT);
  }
  if (!VALID_STYLES.includes(raw.style)) {
    return makeError(ERROR.INVALID_STYLE);
  }
  if (typeof raw.user_id !== 'string') {
    return makeError(ERROR.MISSING_USER_ID);
  }

  return {
    prompt:  raw.prompt,
    style:   raw.style,
    user_id: raw.user_id,
  };
}

export { VALID_STYLES, ERROR };
