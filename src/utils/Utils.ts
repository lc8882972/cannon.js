export default {
  defaults: (
    options: { [key: string]: any },
    defaults: { [key: string]: any }
  ) => {
    return Object.assign({}, defaults, options);
  }
};
