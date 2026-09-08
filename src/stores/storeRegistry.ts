export const storeRegistry: Record<string, any> = {};

export const registerStore = (name: string, store: any) => {
  storeRegistry[name] = store;
};

export const getStore = (name: string) => {
  return storeRegistry[name];
};
