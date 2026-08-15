import type { MaybeRefOrGetter } from 'vue'

/**
 * Per-page SEO from the localized `seo.<key>` strings. Sets the document title
 * (the app's titleTemplate appends the brand) plus the meta description and their
 * Open Graph mirrors, so a shared link previews with a real title and blurb in
 * whichever language the page is in. `params` feeds interpolation, e.g. the team
 * name on /team/:id.
 */
export function useSeo(key: string, params?: MaybeRefOrGetter<Record<string, unknown>>) {
  const { t } = useI18n()
  const title = computed(() => t(`seo.${key}.title`, toValue(params) ?? {}))
  const description = computed(() => t(`seo.${key}.desc`, toValue(params) ?? {}))
  useSeoMeta({ title, description, ogTitle: title, ogDescription: description })
}
