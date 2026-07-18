import { ThrottlerModule } from '@nestjs/throttler';

describe('Throttler config (M8)', () => {
  it('expose ThrottlerModule.forRoot', () => {
    expect(typeof ThrottlerModule.forRoot).toBe('function');
    const dynamic = ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
    ]);
    expect(dynamic.module).toBe(ThrottlerModule);
  });
});
