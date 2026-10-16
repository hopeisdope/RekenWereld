/** Status van één antwoordoptie, afgeleid uit de missiestatus. */
export interface AnswerView {
  /** Foute antwoorden die al gekozen zijn: uitgeschakeld. */
  wrong: readonly number[];
  /** Goed antwoord gegeven: alles vergrendeld, goede optie gemarkeerd. */
  solved: boolean;
  showHint: boolean;
  onAnswer(value: number): void;
}
