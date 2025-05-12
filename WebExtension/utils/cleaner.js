/*

 */

const dataCleaner = (key, value) => {
    console.log('key: "' + key + '" value: >>>' + value + '<<<');
    if (key.toLowerCase() === 'prompt') {
        return value.replaceAll('"is_changed": [NaN]', '"is_changed": false');
    }
    return value;
};

export default dataCleaner;
