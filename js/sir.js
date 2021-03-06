// SIR model *******************************************************************

class SIR {
  constructor(){
      this.t_0 = "05/02/2020";
      this.t_end = "31/07/2020";
      this.graphT_0 = "01/02/2020";
      this.graphT_end = "31/07/2020";
      this.t_LD = "16/03/2020";

      this.S_0 = 778;
      this.I_0 = 1.2 / this.S_0;
      this.R_0 = 0;

      this.lockDown = false;
      this.beta = 0.29;
      this.beta_LD = 0.29;
      this.gamma = 1/7;
      this.repro_0 = this.beta / this.gamma;
      document.getElementById('textRepro_0').innerHTML = this.repro_0.toFixed(2);

      this.stepsPerDay = 10;

      this.S = {};
      this.I = {};
      this.R = {};

      this.IperDay = {};
      this.RperDay = {};
      this.exp = {};
      this.Isir_Ipcr = {};

      this.paramsToOptimize = [];
  }

  _dateStrToObj( dateStr ){
    return new Date(
      parseInt( dateStr.substr(6,4) ),
      parseInt( dateStr.substr(3,2) )-1,
      parseInt( dateStr.substr(0,2) )
    );
  }

  _dateObjToStr( dateObj ){
    var str = String( dateObj.getDate() ).padStart(2, '0') + "/";
    str += String( dateObj.getMonth() + 1 ).padStart(2, '0') + "/";
    str += String( dateObj.getFullYear() );
    return str;
  };

  setParams( params ){
    var allParams = [
      't_0', 't_end', 'graphT_0', 'graphT_end', 't_LD',
      'S_0', 'I_0', 'R_0', 'lockDown', 'beta', 'beta_LD', 'gamma'
    ];
    for( var i = 0; i < allParams.length; i++ ){
      if( typeof params[allParams[i]] !== 'undefined' ){
        this[allParams[i]] = params[allParams[i]];
      }
    };
  }

  importTestData( numTests, numPositives ){
    this.numTests = numTests;
    this.numPositives = numPositives;
  }

  compute(){

    this.exp = {};

    var sirDates = [];
    var startDateObj = this._dateStrToObj( this.t_0 );
    var endDateObj = this._dateStrToObj( this.t_end );
    for( var d = startDateObj; d <= endDateObj; d.setDate( d.getDate() + 1 )) {
      sirDates.push( new Date(d) );
    };

    // console.log( sirDates );

    // set SIR R object = 0 and set SIR S object = 0 until t_0
    var startDateObj2 = this._dateStrToObj( this.graphT_0 );
    for( var d = startDateObj2; d < this._dateStrToObj( this.t_0 ); d.setDate( d.getDate() + 1 )) {
        // console.log( d );
        this.S[this._dateObjToStr(d)] = ''; // this.S_0;
        this.I[this._dateObjToStr(d)] = ''; // 0
        this.R[this._dateObjToStr(d)] = ''; // this.R_0;

        this.IperDay[this._dateObjToStr(d)] = '';
        this.RperDay[this._dateObjToStr(d)] = '';
        this.exp[this._dateObjToStr(d)] = '';
    };

    /* 1 s before t_0
    var t_0_minus_1_s = new Date( this._dateStrToObj(this.t_0) );
    t_0_minus_1_s.setSeconds( t_0_minus_1_s.getSeconds() - 1 );

    console.log( t_0_minus_1_s );

    this.S[t_0_minus_1_s] = this.S_0;
    this.I[t_0_minus_1_s] = 0;
    this.R[t_0_minus_1_s] = this.R_0;

    this.IperDay[t_0_minus_1_s] = 0;
    this.RperDay[t_0_minus_1_s] = 0;
    */
    // ************************************************************

    var sStep = [];
    var iStep = [];
    var rStep = [];

    sStep[0] = this.S_0;
    iStep[0] = this.I_0 * this.S_0;
    rStep[0] = this.R_0;

    var stageAB;
    var stageBC;
    var stageABset = false;
    var stageBCset = false;

    var i = 0;
    var curBeta;
    var betaSteps = 0;
    var curBetaArr = [];

    for( var d = 0; d < sirDates.length; d++ ) {

      var dateStrCur = this._dateObjToStr( sirDates[d] );

      this.S[dateStrCur] = sStep[i];
      this.I[dateStrCur] = iStep[i];
      this.R[dateStrCur] = rStep[i];

      if( !stageBCset ){
        this.exp[dateStrCur] = this.I_0 * this.S_0 * Math.exp( ( this.beta - this.gamma ) * d );
      };

      for( var s = 1; s <= this.stepsPerDay; s++ ){

        // beta **************************************
        if( this.lockDown && sirDates[d-1] >= this._dateStrToObj( this.t_LD ) ) {
          if( betaSteps < this.stepsPerDay ) {
            betaSteps++;
            curBeta = this.beta * ( 1 - betaSteps / this.stepsPerDay) + ( betaSteps / this.stepsPerDay ) * this.beta_LD;
            curBetaArr.push( curBeta );
          }
          else {
            curBeta = this.beta_LD;
          };
        }
        else {
          curBeta = this.beta;
        };

        sStep[i+1] = sStep[i] - ( curBeta / this.S_0 ) * sStep[i] * iStep[i] / this.stepsPerDay;
        iStep[i+1] = iStep[i] + ( ( curBeta / this.S_0 ) * sStep[i] * iStep[i] - this.gamma * iStep[i] ) / this.stepsPerDay;
        rStep[i+1] = rStep[i] + this.gamma * iStep[i] / this.stepsPerDay;

        i++;
      };

      this.IperDay[dateStrCur] = - ( sStep[i-1] - this.S[dateStrCur] );
      this.RperDay[dateStrCur] = - ( rStep[i-1] - this.R[dateStrCur] );

      /*
      if( sirDates[d-1] >= this._dateStrToObj( this.t_LD ) ) {
        this.Isir_Ipcr[dateStrCur] = this.IperDay[dateStrCur] - ( 100 * ( this.numPositives[dateStrCur] / this.numTests[dateStrCur] ) );
      }
      else {
        this.Isir_Ipcr[dateStrCur] = 0;
      };
      */

      if(
        d > 1
        &&
        this.IperDay[dateStrCur] <  this.IperDay[this._dateObjToStr(sirDates[d-1])]
        &&
        !stageABset
      ){
        stageAB = sirDates[d-1];
        stageABset = true;
      };

      if(
        d > 1
        &&
        this.I[dateStrCur] <  this.I[this._dateObjToStr(sirDates[d-1])]
        &&
        !stageBCset
      ){
        stageBC = sirDates[d-1];
        stageBCset = true;
      };

    };

    // console.log(curBetaArr)



    return {
      S: this.S,
      I: this.I,
      R: this.R,
      exp: this.exp,
      IperDay: this.IperDay,
      RperDay: this.RperDay,
      Isir_Ipcr: this.Isir_Ipcr,
      stageAB: stageAB,
      stageBC: stageBC
    }
  }

  functionToMinimize( params ){
    var result = 0.0;
    for( var i = 0; i < v.length; i++ ){
      result = result + v[i] * v[i]
    };
    return result;
  }

  optimize(){

  }
};
