// @ts-nocheck

export const groupBy = (xs: Array<Object>, key: string): object =>
  xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});

export const hasSubarray = (master, sub): boolean =>
  sub.every(
    (
      i => v =>
        (i = master.indexOf(v, i) + 1)
    )(0),
  );

export const intersectArray = (
  array1: Array<any>,
  array2: Array<any>,
): Array<any> => array1.filter(value => array2.includes(value));
