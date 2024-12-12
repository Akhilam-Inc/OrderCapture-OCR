frappe.provide('ordercapture_ocr.components');

ordercapture_ocr.components.FileUploader = {
    template: `
        <div class="widget">
            <button @click="uploadFile" class="btn btn-primary">Upload Document</button>
            <div v-if="uploadStatus" class="mt-2">{{ uploadStatus }}</div>
        </div>
    `,
    // ... component logic
};

Vue.component('file-uploader', ordercapture_ocr.components.FileUploader);
