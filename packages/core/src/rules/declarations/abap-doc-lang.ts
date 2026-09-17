export function removeEnglishLangFromAbapDoc(sourceText: string): string {
  return sourceText.replace(/^(\s*"!.*)<p class="shorttext synchronized" lang="en">/gim, '$1<p class="shorttext synchronized">');
}