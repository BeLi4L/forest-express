function ParamsFieldsDeserializer(paramsFields) {
  this.perform = function () {
    if (paramsFields) {
      return Object.keys(paramsFields).reduce((fields, modelName) => {
        fields[modelName] = paramsFields[modelName].split(',');
        return fields;
      }, {});
    }
    return null;
  };
}

module.exports = ParamsFieldsDeserializer;
