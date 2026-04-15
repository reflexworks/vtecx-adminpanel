import { fetcher } from './fetcher'

/**
 * Stripe関連の共通ユーティリティ
 * すべての関数で fetcher を使用します。
 */

/**
 * Stripe Customer Portal のURLを取得して別タブで開く。
 * GET /d/?_billingportal → 200 { feed: { title: 'StripeURL' } }
 */
export async function openBillingPortal(): Promise<void> {
  const res = await fetcher('/d/?_billingportal', 'get')
  const redirectUrl: string | undefined = res?.data?.feed?.title
  if (redirectUrl) {
    window.open(redirectUrl, '_blank')
    return
  }
  throw new Error('ポータルURLの取得に失敗しました。')
}

/**
 * サービスをPro環境へ変更するリクエストを送る。
 * PUT /d?_servicetoproduction={serviceName}
 * - レスポンスボディ { feed: { title: 'StripeURL' } } → window.location.href で遷移
 * - ボディにURLがない場合 → 即時変更完了（202相当）として 'upgraded' を返す
 */
export async function upgradeToProduction(serviceName: string): Promise<'upgraded'> {
  const res = await fetcher(`/d?_servicetoproduction=${encodeURIComponent(serviceName)}`, 'put')
  const redirectUrl: string | undefined = res?.data?.feed?.title
  // URLの場合のみリダイレクト（202の場合はメッセージが入るためURLチェックが必要）
  if (redirectUrl && redirectUrl.startsWith('http')) {
    window.location.href = redirectUrl
  }
  return 'upgraded'
}

/**
 * サービスをFree環境へ戻す申請を行う。
 * PUT /d?_servicetostaging={serviceName} → 200
 * cancel_at はレスポンスには含まれないため、呼び出し側で
 * GET /d/_user/{uid}/service/{serviceName}?e を使って取得すること。
 */
export async function downgradeToStaging(serviceName: string): Promise<void> {
  await fetcher(`/d?_servicetostaging=${encodeURIComponent(serviceName)}`, 'put')
}
