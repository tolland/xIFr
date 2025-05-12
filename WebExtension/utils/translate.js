

export function translateFields(data) {
    const newdata = {};
    Object.keys(data).forEach(key_v => {
        let key = key_v;
        let label = key;
        let val = data[key_v];
        if (typeof key === "string") {
            label = stringBundle.getString(key.replace('.', '_'));
        }
        if (typeof val === "string") {
            val = stringBundle.getString(val);
        }
        newdata[key] = {label: label, value: val};
    });
    return newdata;
}