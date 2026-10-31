import { useMemo } from "react"
import { CommitWindowSizeDraft, EditWindowSizeDraft, ObserveWindowSizeDraft } from "@guess/guesser-state"
import { useUseCases } from "../bridge/provider.tsx"
import { useObserve } from "../bridge/use-observe.ts"
import { useRun } from "../bridge/use-run.ts"

const observeWindowSizeDraft = new ObserveWindowSizeDraft()

/** The text of the size field, and the commands that edit and commit it. */
export const useWindowSizeDraft = (): readonly [
  string | undefined,
  { readonly edit: (text: string) => void; readonly commit: () => void },
] => {
  const useCases = useUseCases()
  const text = useObserve(useCases.observeWindowSizeDraft, observeWindowSizeDraft)
  const runEdit = useRun(useCases.editWindowSizeDraft)
  const runCommit = useRun(useCases.commitWindowSizeDraft)
  const actions = useMemo(
    () => ({
      edit: (value: string) => runEdit(new EditWindowSizeDraft({ text: value })),
      commit: () => runCommit(new CommitWindowSizeDraft()),
    }),
    [runEdit, runCommit],
  )
  return [text, actions] as const
}
