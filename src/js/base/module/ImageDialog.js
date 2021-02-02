import $ from 'jquery';
import env from '../core/env';
import key from '../core/key';

export default class ImageDialog {
  constructor(context) {
    this.context = context;
    this.ui = $.summernote.ui;
    this.$body = $(document.body);
    this.$editor = context.layoutInfo.editor;
    this.options = context.options;
    this.lang = this.options.langInfo;
  }

  initialize() {
    let imageLimitation = '';
    if (this.options.maximumImageFileSize) {
      const unit = Math.floor(Math.log(this.options.maximumImageFileSize) / Math.log(1024));
      const readableSize = (this.options.maximumImageFileSize / Math.pow(1024, unit)).toFixed(2) * 1 +
                         ' ' + ' KMGTP'[unit] + 'B';
      imageLimitation = `<small>${this.lang.image.maximumFileSize + ' : ' + readableSize}</small>`;
    }

    const $container = this.options.dialogsInBody ? this.$body : this.options.container;
    let body = [
      '<div class="form-group note-form-group note-group-select-from-files">',
        '<label for="note-dialog-image-file-' + this.options.id + '" class="note-form-label">' + this.lang.image.selectFromFiles + '</label>',
        '<input id="note-dialog-image-file-' + this.options.id + '" class="note-image-input form-control-file note-form-control note-input" ',
        ' type="file" name="files" accept="'+this.options.acceptImageFileTypes+'" multiple="multiple"/>',
        imageLimitation,
      '</div>',
      '<div class="form-group note-group-image-url">',
        '<label for="note-dialog-image-url-' + this.options.id + '" class="note-form-label">' + this.lang.image.url + '</label>',
        '<input id="note-dialog-image-url-' + this.options.id + '" class="note-image-url form-control note-form-control note-input" type="text"/>',
      '</div>',
    ].join('');
    if (this.options.imageCanBeLinked) {
      body += ['<div class="form-group note-form-group">',
        `<label for="note-dialog-link-url-${this.options.id}" class="note-form-label">${this.lang.link.url}</label>`,
        `<input id="note-dialog-link-url-${this.options.id}" class="note-link-url form-control note-form-control note-input" type="text" value="http://"/>`,
      '</div>'].join('');
    }
    const buttonClass = 'btn btn-primary note-btn note-btn-primary note-image-btn';
    const footer = `<input type="button" href="#" class="${buttonClass}" value="${this.lang.image.insert}" disabled>`;

    this.$dialog = this.ui.dialog({
      title: this.lang.image.insert,
      fade: this.options.dialogsFade,
      body: body,
      footer: footer,
    }).render().appendTo($container);
  }

  destroy() {
    this.ui.hideDialog(this.$dialog);
    this.$dialog.remove();
  }

  bindEnterKey($input, $btn) {
    $input.on('keypress', (event) => {
      if (event.keyCode === key.code.ENTER) {
        event.preventDefault();
        $btn.trigger('click');
      }
    });
  }

  show() {
    this.context.invoke('editor.saveRange');
    this.showImageDialog().then((data, linkUrl) => {
      // [workaround] hide dialog before restore range for IE range focus
      this.ui.hideDialog(this.$dialog);
      this.context.invoke('editor.restoreRange');

      if (typeof data === 'string') { // image url
        // If onImageLinkInsert set,
        if (this.options.callbacks.onImageLinkInsert) {
          this.context.triggerEvent('image.link.insert', data, linkUrl);
        } else {
          this.context.invoke('editor.insertImage', data, undefined, linkUrl);
        }
      } else { // array of files
        this.context.invoke('editor.insertImagesOrCallback', data, linkUrl);
      }
    }).fail(() => {
      this.context.invoke('editor.restoreRange');
    });
  }

  /**
   * show image dialog
   *
   * @param {jQuery} $dialog
   * @return {Promise}
   */
  showImageDialog() {
    return $.Deferred((deferred) => {
      const $imageInput = this.$dialog.find('.note-image-input');
      const $imageUrl = this.$dialog.find('.note-image-url');
      const $imageBtn = this.$dialog.find('.note-image-btn');
      const $linkUrl = this.$dialog.find('.note-link-url');

      this.ui.onDialogShown(this.$dialog, () => {
        this.context.triggerEvent('dialog.shown');

        // Cloning imageInput to clear element.
        $imageInput.replaceWith($imageInput.clone().on('change', (event) => {
          deferred.resolve(event.target.files || event.target.value, $linkUrl.val());
        }).val(''));

        $imageUrl.on('input paste propertychange', () => {
          this.ui.toggleBtn($imageBtn, $imageUrl.val());
        }).val('');

        $linkUrl.val('');

        if (!env.isSupportTouch) {
          $imageUrl.trigger('focus');
        }

        $imageBtn.click((event) => {
          event.preventDefault();
          deferred.resolve($imageUrl.val(), $linkUrl.val());
        });

        this.bindEnterKey($imageUrl, $imageBtn);
        this.bindEnterKey($linkUrl, $imageBtn);
      });

      this.ui.onDialogHidden(this.$dialog, () => {
        $imageInput.off();
        $imageUrl.off();
        $imageBtn.off();

        if (deferred.state() === 'pending') {
          deferred.reject();
        }
      });

      this.ui.showDialog(this.$dialog);
    });
  }
}
