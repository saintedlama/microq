module.exports = function(collection) {
  return {
    find(criteria, projection) {
      return new Promise((resolve, reject) => {
        collection.find(criteria, projection, (err, result) => err ? reject(err) : resolve(result));
      });
    },

    insert(docOrDocs) {
      return new Promise((resolve, reject) => {
        collection.insert(docOrDocs, (err, result) => err ? reject(err) : resolve(result));
      });
    },

    update(query, update, options) {
      return new Promise((resolve, reject) => {
        collection.update(query, update, options, (err, result) => err ? reject(err) : resolve(result));
      });
    },

    remove(query, options) {
      return new Promise((resolve, reject) => {
        collection.remove(query, options, (err, result) => err ? reject(err) : resolve(result));
      });
    },

    findAndModify(document) {
      return new Promise((resolve, reject) => {
        collection.findAndModify(document, (err, result) => err ? reject(err) : resolve(result));
      });
    }
  }
}