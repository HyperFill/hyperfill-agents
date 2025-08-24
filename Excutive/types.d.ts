declare module 'minimatch' {
  function minimatch(target: string, pattern: string, options?: any): boolean;
  namespace minimatch {
    interface IOptions {
      debug?: boolean;
      nobrace?: boolean;
      noglobstar?: boolean;
      dot?: boolean;
      noext?: boolean;
      nocase?: boolean;
      nonull?: boolean;
      matchBase?: boolean;
      nocomment?: boolean;
      nonegate?: boolean;
      flipNegate?: boolean;
    }
    interface IMinimatch {
      pattern: string;
      options: IOptions;
      set: any;
      regexp: RegExp;
      negate: boolean;
      comment: boolean;
      empty: boolean;
      match(fname: string): boolean;
      makeRe(): RegExp;
    }
  }
  export = minimatch;
}