// Keep preview inventories separate from the published app and other PRs.
export function storageKey(key,pathname=globalThis.location?.pathname||'') {
 const preview=pathname.match(/\/previews\/pr-(\d+)(?:\/|$)/)?.[1];
 return preview?'preview.pr'+preview+'.'+key:key;
}
export const storage={
 getItem:key=>globalThis.localStorage.getItem(storageKey(key)),
 setItem:(key,value)=>globalThis.localStorage.setItem(storageKey(key),value),
 removeItem:key=>globalThis.localStorage.removeItem(storageKey(key))
};
