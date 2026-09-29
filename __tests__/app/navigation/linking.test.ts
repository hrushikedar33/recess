import { getStateFromPath } from '@react-navigation/native';
import { linking } from '@app/navigation/linking';
import { Routes } from '@app/navigation/routes';

const stateFor = (path: string) => getStateFromPath(path, linking.config);

describe('deep links', () => {
  it('opens the Break screen for recess://break', () => {
    expect(stateFor('break')?.routes[0].name).toBe(Routes.Break);
  });

  it('opens nothing for a path it does not know', () => {
    expect(stateFor('delete-everything')).toBeUndefined();
    expect(stateFor('goals')).toBeUndefined();
  });

  it('still only opens the Break screen when junk parameters are added', () => {
    const state = stateFor('break?cooldown=0&app=com.evil');

    expect(state?.routes).toHaveLength(1);
    expect(state?.routes[0].name).toBe(Routes.Break);
  });

  describe('the URL filter, which runs before any parsing', () => {
    const accepts = (url: string) => linking.filter?.(url) ?? true;

    it('accepts exactly the link the monitor uses', () => {
      expect(accepts('recess://break')).toBe(true);
    });

    it.each([
      ['a query string', 'recess://break?x=%E0%A4%A'],
      ['a fragment', 'recess://break#frag'],
      ['a trailing path', 'recess://break/extra'],
      ['another route', 'recess://goals'],
      ['another scheme', 'https://break'],
      ['nothing', ''],
    ])('rejects %s without parsing it', (_name, url) => {
      expect(accepts(url)).toBe(false);
    });
  });

  it('accepts the recess:// prefix and no other', () => {
    expect(linking.prefixes).toEqual(['recess://']);
  });
});
