import {CONST_EXPR} from 'angular2/src/facade/lang';
import {NG_VALIDATORS} from 'angular2/common';
import {
  Attribute, Input, Provider, Directive, Optional, SkipSelf, Host, OnDestroy, OnInit,
  ContentChildren, QueryList, Query, AfterContentInit
} from 'angular2/core';
import {Validator, NgFormModel, NgControlName} from 'angular2/common';
import {Control, ControlGroup, AbstractControl} from 'angular2/common';
import {isPresent} from 'angular2/src/facade/lang';


// TODO(jd): Behaviors to test
// - md-messages with no md-message children act as message for all errors in a field
// - md-message="propName" binds to FormBuilder group by given name
// - [md-message]="viewLocal" binds to given NgControlName referenced from the view
// - [md-messages] adds md-valid and md-invalid class based on field validation state
// - throws informative errors when it fails to bind to a given form field because it cannot be found.

@Directive({
  selector: '[md-message]',
  host: {
    '[hidden]': 'okay'
  }
})
export class MdMessage {
  @Input('md-message') errorKey: string;

  okay: boolean = true;

  constructor(@Attribute('md-message') pattern: any) {
    if (isPresent(pattern)) {
      this.errorKey = pattern;
    }
  }
}


@Directive({
  selector: '[md-messages]',
  host: {
    'md-messages': '',
    '[hidden]': 'valid || !isTouched',
    '[class.md-valid]': 'valid && isTouched',
    '[class.md-invalid]': '!valid && isTouched'
  }
})
export class MdMessages implements OnInit, OnDestroy {

  @Input('md-messages') property: string|NgControlName;

  valid: boolean;

  get isTouched(): boolean {
    if (this.property instanceof NgControlName) {
      return (<NgControlName>this.property).touched;
    }
    let prop = <string>this.property;
    let group = this.form.control;
    let ctrl = group.controls[prop];
    return ctrl && ctrl.touched;
  }


  constructor(@Query(MdMessage) public messages: QueryList<MdMessage>,
              @Optional() @SkipSelf() @Host() public form: NgFormModel,
              @Attribute('md-messages') pattern: any) {
    if (isPresent(pattern)) {
      this.property = pattern;
    }
  }

  /**
   * Subscription to value changes that is to be dropped when the component is destroyed.
   * @type {null}
   * @private
   */
  private _unsubscribe: any = null;

  ngOnInit() {
    if (this.property instanceof NgControlName) {
      let ctrl: NgControlName = <NgControlName>this.property;
      this.form = ctrl.formDirective;
      this._unsubscribe = (<any>ctrl).update.subscribe(this._valueChanged.bind(this));
    }
    else {
      if (!this.form) {
        throw new Error('md-messages cannot bind to text property without a parent NgFormModel');
      }
      let prop = <string>this.property;
      let group: ControlGroup = this.form.control;
      if (!group) {
        throw new Error('md-messages cannot bind to text property without a ControlGroup');
      }
      let ctrl: AbstractControl = group.controls[prop];
      if (!ctrl) {
        throw new Error(`md-messages cannot find property(${prop}) in ControlGroup!`);
      }
      this._unsubscribe = ctrl.valueChanges.subscribe(this._valueChanged.bind(this));
    }
  }

  ngOnDestroy(): any {
    this._unsubscribe.unsubscribe();
  }

  private _valueChanged(newValue: string) {
    let errors: {[errorKey:string]:string} = null;
    if (this.property instanceof NgControlName) {
      let ctrl: NgControlName = <NgControlName>this.property;
      errors = ctrl.errors;
    }
    else {
      let prop = <string>this.property;
      let group = this.form.control;
      let ctrl: AbstractControl = group.controls[prop];
      errors = ctrl.errors;
    }
    this.valid = !errors;
    if (errors) {
      this.messages.toArray().forEach((m: MdMessage) => {
        m.okay = !m.errorKey ? !errors : !isPresent(errors[m.errorKey]);
      });
    }

  }
}
