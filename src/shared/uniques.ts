import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
try {
  admin.initializeApp();
} catch (e) {
  /* empty */
}
const db = admin.firestore();
/**
 * Creates a unique field index
 * @param colPath - collection / field name
 * @param field - field value
 * @param fkName - foreign key name
 * @param fkVal - foreign key value
 * @param uniqueCol - unique collection
 */
export async function createField(
  colPath: string,
  field: string,
  fkName: string,
  fkVal: string,
  uniqueCol = '_uniques',
): Promise<any> {
  console.log('Creating unique index on ', field);

  const titleRef = db.doc(`${uniqueCol}/${colPath}/${field}`);
  return titleRef.set({ [fkName]: fkVal }).catch((e: any) => {
    console.log(e);
  });
}
/**
 * Deletes a unique field index
 * @param colPath - collection / field name
 * @param field - field value
 * @param uniqueCol - unique collection
 */
export async function deleteField(colPath: string, field: string, uniqueCol = '_uniques'): Promise<any> {
  console.log('Deleting unique index on ', field);

  const titleRef = db.doc(`${uniqueCol}/${colPath}/${field}`);
  return titleRef.delete().catch((e: any) => {
    console.log(e);
  });
}
/**
 * Updates a unique field index
 * @param colPath - collection / field name
 * @param oldField - old field value
 * @param newField - new field value
 * @param fkName - foreign key name
 * @param fkVal - foreign key value
 * @param uniqueCol - unique collectino
 */
export async function updateField(
  colPath: string,
  oldField: string,
  newField: string,
  fkName: string,
  fkVal: string,
  uniqueCol = '_uniques',
): Promise<any> {
  console.log('Changing unique index from ', oldField, ' to ', newField);

  const oldTitleRef = db.doc(`${uniqueCol}/${colPath}/${oldField}`);
  const newTitleRef = db.doc(`${uniqueCol}/${colPath}/${newField}`);
  const batch = db.batch();

  batch.delete(oldTitleRef);
  batch.create(newTitleRef, { [fkName]: fkVal });

  return batch.commit().catch((e: any) => {
    console.log(e);
  });
}
/**
 * Handle all unique instances
 * @param change - change snapshot
 * @param context - event context
 * @param field - feild to index
 * @param friendly - boolean: save friendly string
 * @param newField - the value of the field if you want to filter it
 * @param fkName - name of foreign key field
 * @param uniqueCol - name of unique collection
 */
export async function uniqueField(
  change: functions.Change<functions.firestore.DocumentSnapshot>,
  context: functions.EventContext,
  field: string,
  friendly = false,
  newField = '',
  fkName = 'docId',
  uniqueCol?: string,
) {
  // get column information
  const colId = context.resource.name.split('/')[5];
  const fkVal = context.params[fkName];

  const uniquePath = colId + '/' + field;

  // simplify input data
  const before: any = change.before.exists ? change.before.data() : null;

  const delim = '___';

  const { getValue, createDoc, updateDoc, deleteDoc, getFriendlyURL } = require('./tools');

  // if certain newField value
  if (!newField) {
    newField = getValue(field);
  }
  let oldField = '';
  if (before) {
    oldField = before[field];
  }

  // replace '/' character, since can't save it
  newField = newField.replace(/\//g, delim);
  oldField = oldField.replace(/\//g, delim);
  
  if (friendly) {
    newField = getFriendlyURL(newField);
    oldField = getFriendlyURL(oldField);
  }

  const fieldChanged = newField !== oldField;

  if (createDoc) {
    await createField(uniquePath, newField, fkName, fkVal, uniqueCol);
  }
  if (deleteDoc) {
    await deleteField(uniquePath, oldField, uniqueCol);
  }
  if (updateDoc && fieldChanged) {
    await updateField(uniquePath, oldField, newField, fkName, fkVal, uniqueCol);
  }
  return null;
}
