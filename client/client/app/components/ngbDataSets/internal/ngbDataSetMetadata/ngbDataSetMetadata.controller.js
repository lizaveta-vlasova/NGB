import BaseController from '../../../../shared/baseController';

function metadataIsEqual(o1, o2) {
    if ((!o1 && o2) || (o1 && !o2)) {
        return false;
    }
    if (o1 && o2) {
        if (Object.keys(o1).length !== Object.keys(o2).length) {
            return false;
        }
        for(const p in o1) {
            if(o1.hasOwnProperty(p)){
                if(o1[p] !== o2[p]) {
                    return false;
                }
            }
        }
        for(const p in o2) {
            if(o2.hasOwnProperty(p)){
                if(o1[p] !== o2[p]) {
                    return false;
                }
            }
        }
    }
    return true;
}
export function sortObjectByKeyValue(obj) {
    if (obj) {
        return Object.entries(obj)
        .sort(([key1,], [key2,]) => key1.localeCompare(key2))
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    }
    return obj;
}
export default class ngbDataSetMetadataController extends BaseController {
    node;
    formData;
    initial_metadata;
    metadata;
    saving;
    scrollableEl = null;

    static get UID() {
        return 'ngbDataSetMetadataController';
    }

    constructor($mdDialog, $state, dispatcher, node, ngbDataSetsService) {
        super();
        Object.assign(this, {
            $mdDialog,
            $state,
            dispatcher,
            node,
            service: ngbDataSetsService.projectDataService
        });
        this.formData = Object.entries(this.node.metadata || {}).sort(([key1,], [key2,]) => key1.localeCompare(key2));
        this.initial_metadata = this.node.metadata || {};
    }
    get metadataIsEmpty() {
        return Object.keys(this.formData).length === 0;
    }
    get metadataIsChanged() {
        return !metadataIsEqual(this.metadata, this.initial_metadata);
    }
    get metadata() {
        return Object.fromEntries(this.formData);
    }
    get sortedMetadata() {
        return sortObjectByKeyValue(this.metadata);
    }
    get existedKeys() { 
        return this.formData.map(pair => pair[0]).reduce((r, key) => {
            const caseInsensitiveKey = key ? key.toLowerCase() : null;
            if (caseInsensitiveKey) {
                r[caseInsensitiveKey] = (r[caseInsensitiveKey] || 0) + 1;
            }
            return r;
        }, {});
    }
    get formHasDuplicates() {
        return Object.values(this.existedKeys).filter(v => v > 1).length;
    }
    async saveMetadata() {
        const node = this.node;
        const requestBody = {
            id: node.id,
            aclClass: this.service.getNodeAclClass(node),
            metadata: this.sortedMetadata
        };
        this.saving = true;
        await this.service.saveMetadata(requestBody);
        this.saving = false;
        this.dispatcher.emitSimpleEvent('metadata:change', {
            id: node.id,
            projectId: node.isProject ? node.id : node.project.id,
            metadata: this.sortedMetadata,
            isFile: node.type === 'FILE',
            displayName: node.displayName
        });
        this.$state.reload();
        this.$mdDialog.hide();
    }
    closeDialog() { 
        this.$mdDialog.cancel();
    }
    cancelChanges() {
        this.$mdDialog.cancel();
    }
    addFormItem() {
        this.formData.push(['', '']);
        if (!this.scrollableEl) {
            this.scrollableEl = document.querySelector('.scrollable-container');
        }
        setTimeout(() => {
            this.scrollableEl.scrollIntoView({behavior: 'smooth', block: 'end'});
        }, 0);
    }
    removeAttribute(index) {
        this.formData = this.formData.filter((_el, elIndex) => index !== elIndex);
    }
    isDuplicate(newKey) {
        return !!Object.entries(this.existedKeys)
            .filter(([key, value]) => (
                newKey &&
                newKey.toLowerCase() === key.toLowerCase() &&
                value > 1
            ))[0];
    }
}
