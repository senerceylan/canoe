'use strict'
/* global angular device */
var modules = [
  'angularMoment',
  'monospaced.qrcode',
  'gettext',
  'ionic',
  'ionic-toast',
  'angular-clipboard',
  'ngTouch',
  'ngLodash',
  'ngCsv',
  'angular-md5',
  'ngIdle',
  'canoeApp.filters',
  'canoeApp.services',
  'canoeApp.controllers',
  'canoeApp.directives',
  'canoeApp.addons'
]

window.canoeApp = angular.module('canoeApp', modules)

angular.module('canoeApp.filters', [])
angular.module('canoeApp.services', [])
angular.module('canoeApp.controllers', [])
angular.module('canoeApp.directives', [])
angular.module('canoeApp.addons', [])

function getUUID () {
  if (window.isCordovaApp) {
    var uuid = device.uuid
    if ((uuid.length) > 16) {
      // On iOS we get a uuid that is too long, strip it down to 16
      uuid = uuid.substring(uuid.length - 16, uuid.length)
    }
    return uuid
  } else {
    return guid()
  }
}

/**
 * Generates a GUID string.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
function guid () {
  function _p8 (s) {
    var p = (Math.random().toString(16) + '000000000').substr(2, 8)
    return s ? '-' + p.substr(0, 4) + '-' + p.substr(4, 4) : p
  }
  return _p8() + _p8(true) + _p8(true) + _p8()
}

'use strict'
/* global screen cordova angular chrome */

var unsupported, isaosp

if (window && window.navigator) {
  var rxaosp = window.navigator.userAgent.match(/Android.*AppleWebKit\/([\d.]+)/)
  isaosp = (rxaosp && rxaosp[1] < 537)
  if (!window.cordova && isaosp) { unsupported = true }
  if (unsupported) {
    window.location = '#/unsupported'
  }
}

/**
 * Helper function to get the property value at path of object.
 *
 * @param object The object to query.
 * @param path   The path of the property to get.
 * @returns {*} The queried value if the path exists in the given object, otherwise undefined.
 */
function get (object, path) {
  return path.split('.').reduce((acc, prop) =>
    acc !== undefined && Object.hasOwnProperty.call(acc, prop) ? acc[prop] : undefined, object
  )
}

/**
* Helper function which allows to apply Chrome specific settings when running under nw.js.
*
* @param prop  The settings prop for which the settings should be applied. Must be passed as string.
* @param value The value to apply to the given settings props.
*/
function applyChromeSetting (prop, value) {
  const settingsObject = get(chrome, prop)
  if (settingsObject === undefined) {
    console.info('Setting `chrome.' + prop + '` cannot be handled by this browser.')
    return
  }
  settingsObject.get({}, function (details) {
    if (details.levelOfControl === 'controllable_by_this_extension') {
      settingsObject.set({ value }, function () {
        if (chrome.runtime.lastError === undefined) {
          console.info('Successfully applied value `' + value + '` to setting `chrome.' + prop + '`')
        } else {
          console.error('Couldn\'t apply value `' + value + '` to setting `chrome.' + prop + '`', chrome.runtime.lastError)
        }
      })
    } else {
      console.info('Cannot control Chrome setting `chrome.' + prop + '`; LevelOfControl is: ' + details.levelOfControl)
    }
  })
}

/**
* Applies the chrome.privacy settings.
*
* For an overview of all settings please visit the following site: https://developer.chrome.com/extensions/privacy
*/
function nwPrivacyConfig () {
  if (chrome.passwordsPrivate.getSavedPasswordList) {
    chrome.passwordsPrivate.getSavedPasswordList(function (passwords) {
      passwords.forEach((p, i) => {
        chrome.passwordsPrivate.removeSavedPassword(i)
      })
    })
  }
  applyChromeSetting('privacy.services.alternateErrorPagesEnabled', false)
  applyChromeSetting('privacy.services.autofillEnabled', false)
  applyChromeSetting('privacy.services.hotwordSearchEnabled', false)
  applyChromeSetting('privacy.services.passwordSavingEnabled', false)
  applyChromeSetting('privacy.services.safeBrowsingExtendedReportingEnabled', false)
  applyChromeSetting('privacy.services.searchSuggestEnabled', false)
  applyChromeSetting('privacy.services.spellingServiceEnabled', false)
  applyChromeSetting('privacy.services.translationServiceEnabled', false)
}

// Setting up route
angular.module('canoeApp').config(function (historicLogProvider, $provide, $logProvider, $stateProvider, $urlRouterProvider, $compileProvider, $ionicConfigProvider, IdleProvider, TitleProvider) {
  TitleProvider.enabled(false)
  // IdleProvider

  $urlRouterProvider.otherwise('/starting')

  // NO CACHE
  // $ionicConfigProvider.views.maxCache(0);

  // TABS BOTTOM
  $ionicConfigProvider.tabs.position('bottom')

  // NAV TITTLE CENTERED
  $ionicConfigProvider.navBar.alignTitle('center')

  // NAV BUTTONS ALIGMENT
  $ionicConfigProvider.navBar.positionPrimaryButtons('left')
  $ionicConfigProvider.navBar.positionSecondaryButtons('right')

  // NAV BACK-BUTTON TEXT/ICON
  $ionicConfigProvider.backButton.icon('icon ion-ios-arrow-thin-left').text('')
  $ionicConfigProvider.backButton.previousTitleText(false)

  // CHECKBOX CIRCLE
  $ionicConfigProvider.form.checkbox('circle')

  // USE NATIVE SCROLLING
  $ionicConfigProvider.scrolling.jsScrolling(false)

  $logProvider.debugEnabled(true)
  $provide.decorator('$log', ['$delegate', 'platformInfo',
    function ($delegate, platformInfo) {
      var historicLog = historicLogProvider.$get()

      historicLog.getLevels().forEach(function (levelDesc) {
        var level = levelDesc.level
        if (platformInfo.isDevel && level === 'error') return

        var orig = $delegate[level]
        $delegate[level] = function () {
          if (level === 'error') { console.log(arguments) }

          var args = Array.prototype.slice.call(arguments)

          args = args.map(function (v) {
            try {
              if (typeof v === 'undefined') v = 'undefined'
              if (!v) v = 'null'
              if (typeof v === 'object') {
                if (v.message) { v = v.message } else { v = JSON.stringify(v) }
              }
              // Trim output in mobile
              if (platformInfo.isCordova) {
                v = v.toString()
                if (v.length > 3000) {
                  v = v.substr(0, 2997) + '...'
                }
              }
            } catch (e) {
              console.log('Error at log decorator:', e)
              v = 'undefined'
            }
            return v
          })

          try {
            if (platformInfo.isCordova) { console.log(args.join(' ')) }

            historicLog.add(level, args.join(' '))
            orig.apply(null, args)
          } catch (e) {
            console.log('ERROR (at log decorator):', e, args[0])
          }
        }
      })
      return $delegate
    }
  ])

  // whitelist 'chrome-extension:' for chromeApp to work with image URLs processed by Angular
  // link: http://stackoverflow.com/questions/15606751/angular-changes-urls-to-unsafe-in-extension-page?lq=1
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob|chrome-extension):|data:image\/)/)

  $stateProvider

  /*
  *
  * Other pages
  *
  */

    .state('unsupported', {
      url: '/unsupported',
      templateUrl: 'views/unsupported.html'
    })

    .state('starting', {
      url: '/starting',
      template: '<ion-view id="starting"><ion-content><div class="block-spinner row"><ion-spinner class="spinner-stable" icon="crescent"></ion-spinner></div></ion-content></ion-view>'
    })

  /*
  *
  * URI
  *
  */

    .state('uri', {
      url: '/uri/:url',
      controller: function ($stateParams, $log, openURLService, profileService) {
        profileService.whenAvailable(function () {
          $log.info('DEEP LINK from Browser:' + $stateParams.url)
          openURLService.handleURL({
            url: $stateParams.url
          })
        })
      }
    })

  /*
   *
   * Wallet
   *
   */
    .state('tabs.account', {
      url: '/account/:accountId/:fromOnboarding/:clearCache',
      views: {
        'tab-home@tabs': {
          controller: 'accountDetailsController',
          templateUrl: 'views/accountDetails.html'
        }
      }
    })
    .state('tabs.account.tx-details', {
      url: '/tx-details/:txid',
      views: {
        'tab-home@tabs': {
          controller: 'txDetailsController',
          templateUrl: 'views/tx-details.html'
        }
      },
      params: {
        ntx: null,
        accountId: null
      }
    })
    .state('tabs.account.backupWarning', {
      url: '/backupWarning/:from/:walletId',
      views: {
        'tab-home@tabs': {
          controller: 'backupWarningController',
          templateUrl: 'views/backupWarning.html'
        }
      }
    })
    .state('tabs.account.backup', {
      url: '/backup/:walletId',
      views: {
        'tab-home@tabs': {
          templateUrl: 'views/backup.html',
          controller: 'backupController'
        }
      }
    })

  /*
   *
   * Tabs
   *
   */
    .state('tabs', {
      url: '/tabs',
      abstract: true,
      controller: 'tabsController',
      templateUrl: 'views/tabs.html'
    })
    .state('tabs.home', {
      url: '/home/:fromOnboarding',
      views: {
        'tab-home': {
          controller: 'tabHomeController',
          templateUrl: 'views/tab-home.html'
        }
      }
    })
    .state('tabs.receive', {
      url: '/receive',
      views: {
        'tab-receive': {
          controller: 'tabReceiveController',
          templateUrl: 'views/tab-receive.html'
        }
      }
    })
    .state('tabs.scan', {
      url: '/scan',
      views: {
        'tab-scan': {
          controller: 'tabScanController',
          templateUrl: 'views/tab-scan.html'
        }
      }
    })
    .state('scanner', {
      url: '/scanner',
      params: {
        passthroughMode: null
      },
      controller: 'tabScanController',
      templateUrl: 'views/tab-scan.html'
    })
    .state('tabs.send', {
      url: '/send',
      views: {
        'tab-send': {
          controller: 'tabSendController',
          templateUrl: 'views/tab-send.html'
        }
      }
    })
    .state('tabs.settings', {
      url: '/settings',
      views: {
        'tab-settings': {
          controller: 'tabSettingsController',
          templateUrl: 'views/tab-settings.html'
        }
      }
    })

  /*
  *
  * Send
  *
  */

    .state('tabs.send.amount', {
      url: '/amount/:recipientType/:toAddress/:toName/:toEmail/:toColor/:fixedUnit/:toAlias/:fromAddress',
      views: {
        'tab-send@tabs': {
          controller: 'amountController',
          templateUrl: 'views/amount.html'
        }
      }
    })
    .state('tabs.send.confirm', {
      url: '/confirm/:recipientType/:toAddress/:toName/:toAmount/:toEmail/:toColor/:description/:coin/:useSendMax/:toAlias/:fromAddress',
      views: {
        'tab-send@tabs': {
          controller: 'confirmController',
          templateUrl: 'views/confirm.html'
        }
      },
      params: {
        paypro: null
      }
    })
    .state('tabs.send.addressbook', {
      url: '/addressbook/add/:fromSendTab/:addressbookEntry/:toAlias/:toName',
      views: {
        'tab-send@tabs': {
          templateUrl: 'views/addressbook.add.html',
          controller: 'addressbookAddController'
        }
      }
    })

  /*
  *
  * Add
  *
  */

    .state('tabs.create-account', {
      url: '/create-account',
      views: {
        'tab-home@tabs': {
          templateUrl: 'views/tab-create-account.html',
          controller: 'createController'
        }
      }
    })

  /*
  *
  * Global Settings
  *
  */

    .state('tabs.notifications', {
      url: '/notifications',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesNotificationsController',
          templateUrl: 'views/preferencesNotifications.html'
        }
      }
    })
    .state('tabs.language', {
      url: '/language',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesLanguageController',
          templateUrl: 'views/preferencesLanguage.html'
        }
      }
    })
    .state('tabs.import', {
      url: '/import',
      views: {
        'tab-settings@tabs': {
          templateUrl: 'views/import.html',
          controller: 'importController'
        }
      }
    })
    .state('tabs.altCurrency', {
      url: '/altCurrency',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesAltCurrencyController',
          templateUrl: 'views/preferencesAltCurrency.html'
        }
      }
    })
    .state('tabs.about', {
      url: '/about',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesAbout',
          templateUrl: 'views/preferencesAbout.html'
        }
      }
    })
    .state('tabs.about.logs', {
      url: '/logs',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesLogs',
          templateUrl: 'views/preferencesLogs.html'
        }
      }
    })
    .state('tabs.about.termsOfUse', {
      url: '/termsOfUse',
      views: {
        'tab-settings@tabs': {
          templateUrl: 'views/termsOfUse.html'
        }
      }
    })
    .state('tabs.about.attributions', {
      url: '/attributions',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesAttributions',
          templateUrl: 'views/attributions.html'
        }
      }
    })
    .state('tabs.advanced', {
      url: '/advanced',
      views: {
        'tab-settings@tabs': {
          controller: 'advancedSettingsController',
          templateUrl: 'views/advancedSettings.html'
        }
      }
    })
    .state('tabs.advanced.changeBackend', {
      url: '/advanced/changeBackend',
      views: {
        'tab-settings@tabs': {
          controller: 'changeBackendController',
          templateUrl: 'views/changeBackend.html'
        }
      }
    })
    .state('tabs.preferencesSecurity', {
      url: '/preferencesSecurity',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesSecurityController',
          templateUrl: 'views/preferencesSecurity.html'
        }
      }
    })
    .state('tabs.preferencesSecurity.changePassword', {
      url: '/preferencesSecurity/changePassword',
      views: {
        'tab-settings@tabs': {
          controller: 'changePasswordController',
          templateUrl: 'views/changePassword.html'
        }
      }
    })
    .state('tabs.preferencesSecurity.changeLocks', {
      url: '/preferencesSecurity/changeLocks',
      views: {
        'tab-settings@tabs': {
          controller: 'changeLocksController',
          templateUrl: 'views/changeLocks.html'
        }
      }
    })
    .state('tabs.password', {
      url: '/password',
      views: {
        'tab-settings@tabs': {
          controller: 'passwordController',
          templateUrl: 'views/modals/password.html',
          cache: false
        }
      }
    })

  /*
  *
  * Wallet preferences
  *
  */

    .state('tabs.preferences', {
      url: '/preferences/:accountId',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesController',
          templateUrl: 'views/preferences.html'
        }
      }
    })
    .state('tabs.preferences.preferencesName', {
      url: '/preferencesName',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesNameController',
          templateUrl: 'views/preferencesName.html'
        }
      }
    })
    .state('tabs.preferences.preferencesAlias', {
      url: '/preferencesAlias',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesAliasController',
          templateUrl: 'views/preferencesAlias.html'
        }
      }
    })
    .state('tabs.preferences.preferencesColor', {
      url: '/preferencesColor',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesColorController',
          templateUrl: 'views/preferencesColor.html'
        }
      }
    })
    .state('tabs.preferences.preferencesRepresentative', {
      url: '/preferencesRepresentative',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesRepresentativeController',
          templateUrl: 'views/preferencesRepresentative.html'
        }
      }
    })
    .state('tabs.settings.backupWarning', {
      url: '/backupWarning/:from',
      views: {
        'tab-settings@tabs': {
          controller: 'backupWarningController',
          templateUrl: 'views/backupWarning.html'
        }
      }
    })
    .state('tabs.settings.backup', {
      url: '/backup',
      views: {
        'tab-settings@tabs': {
          controller: 'backupController',
          templateUrl: 'views/backup.html'
        }
      }
    })
    .state('tabs.export', {
      url: '/export',
      views: {
        'tab-settings@tabs': {
          controller: 'exportController',
          templateUrl: 'views/export.html'
        }
      }
    })
    .state('tabs.preferences.delete', {
      url: '/delete',
      views: {
        'tab-settings@tabs': {
          controller: 'preferencesDeleteWalletController',
          templateUrl: 'views/preferencesDeleteWallet.html'
        }
      }
    })

  /*
  *
  * Addressbook
  *
  */

    .state('tabs.addressbook', {
      url: '/addressbook',
      views: {
        'tab-settings@tabs': {
          templateUrl: 'views/addressbook.html',
          controller: 'addressbookListController'
        }
      }
    })
    .state('tabs.addressbook.add', {
      url: '/add',
      views: {
        'tab-settings@tabs': {
          templateUrl: 'views/addressbook.add.html',
          controller: 'addressbookAddController'
        }
      }
    })
    .state('tabs.addressbook.edit', {
      url: '/edit/:address/:email/:alias/:name',
      views: {
        'tab-settings@tabs': {
          templateUrl: 'views/addressbook.edit.html',
          controller: 'addressbookEditController'
        }
      }
    })
    .state('tabs.addressbook.view', {
      url: '/view/:address/:email/:alias/:name',
      views: {
        'tab-settings@tabs': {
          templateUrl: 'views/addressbook.view.html',
          controller: 'addressbookViewController'
        }
      }
    })

  /*
  *
  * Request Specific amount
  *
  */

    .state('tabs.paymentRequest', {
      url: '/payment-request',
      abstract: true,
      params: {
        id: null,
        nextStep: 'tabs.paymentRequest.confirm'
      }
    })

    .state('tabs.paymentRequest.amount', {
      url: '/amount/:coin',
      views: {
        'tab-receive@tabs': {
          controller: 'amountController',
          templateUrl: 'views/amount.html'
        }
      }
    })

  /*
    *
    * Init backup flow
    *
    */

    .state('tabs.receive.backupWarning', {
      url: '/backupWarning/:from/:walletId',
      views: {
        'tab-receive@tabs': {
          controller: 'backupWarningController',
          templateUrl: 'views/backupWarning.html'
        }
      }
    })
    .state('tabs.receive.backup', {
      url: '/backup/:walletId',
      views: {
        'tab-receive@tabs': {
          controller: 'backupController',
          templateUrl: 'views/backup.html'
        }
      }
    })

  /*
  *
  * Paper Wallet
  *
  */

    .state('tabs.home.paperWallet', {
      url: '/paperWallet/:privateKey',
      views: {
        'tab-home@tabs': {
          controller: 'paperWalletController',
          templateUrl: 'views/paperWallet.html'
        }
      }
    })
  /*
  *
  * Onboarding
  *
  */

    .state('onboarding', {
      url: '/onboarding',
      abstract: true,
      template: '<ion-nav-view name="onboarding"></ion-nav-view>'
    })
    .state('onboarding.welcome', {
      url: '/welcome',
      views: {
        'onboarding': {
          templateUrl: 'views/onboarding/welcome.html',
          controller: 'welcomeController'
        }
      }
    })
    .state('onboarding.tour', {
      url: '/tour',
      views: {
        'onboarding': {
          templateUrl: 'views/onboarding/tour.html',
          controller: 'tourController'
        }
      }
    })
    .state('onboarding.backupRequest', {
      url: '/backupRequest/:walletId',
      views: {
        'onboarding': {
          templateUrl: 'views/onboarding/backupRequest.html',
          controller: 'backupRequestController'
        }
      }
    })
    .state('onboarding.backupWarning', {
      url: '/backupWarning/:from/:walletId',
      views: {
        'onboarding': {
          templateUrl: 'views/backupWarning.html',
          controller: 'backupWarningController'
        }
      }
    })
    .state('onboarding.backup', {
      url: '/backup/:walletId',
      views: {
        'onboarding': {
          templateUrl: 'views/backup.html',
          controller: 'backupController'
        }
      }
    })
    .state('onboarding.aliasRequest', {
      url: '/alias/:walletId/:backedUp',
      views: {
        'onboarding': {
          templateUrl: 'views/onboarding/alias.html',
          controller: 'createAliasController'
        }
      }
    })
    .state('onboarding.disclaimer', {
      url: '/disclaimer/:walletId/:backedUp/:resume',
      views: {
        'onboarding': {
          templateUrl: 'views/onboarding/disclaimer.html',
          controller: 'disclaimerController'
        }
      }
    })
    .state('onboarding.terms', {
      url: '/terms',
      views: {
        'onboarding': {
          templateUrl: 'views/onboarding/terms.html',
          controller: 'termsController'
        }
      }
    })
    .state('onboarding.import', {
      url: '/import',
      views: {
        'onboarding': {
          templateUrl: 'views/import.html',
          controller: 'importController'
        }
      },
      params: {
        code: null,
        fromOnboarding: null
      }
    })

  /*
  *
  * Feedback
  *
  */

    .state('tabs.feedback', {
      url: '/feedback',
      views: {
        'tab-settings@tabs': {
          templateUrl: 'views/feedback/send.html',
          controller: 'sendController'
        }
      }
    })
    .state('tabs.shareApp', {
      url: '/shareApp/:score/:skipped/:fromSettings',
      views: {
        'tab-settings@tabs': {
          controller: 'completeController',
          templateUrl: 'views/feedback/complete.html'
        }
      }
    })
    .state('tabs.rate', {
      url: '/rate',
      abstract: true
    })
    .state('tabs.rate.send', {
      url: '/send/:score',
      views: {
        'tab-home@tabs': {
          templateUrl: 'views/feedback/send.html',
          controller: 'sendController'
        }
      }
    })
    .state('tabs.rate.complete', {
      url: '/complete/:score/:skipped',
      views: {
        'tab-home@tabs': {
          controller: 'completeController',
          templateUrl: 'views/feedback/complete.html'
        }
      }
    })
    .state('tabs.rate.rateApp', {
      url: '/rateApp/:score',
      views: {
        'tab-home@tabs': {
          controller: 'rateAppController',
          templateUrl: 'views/feedback/rateApp.html'
        }
      }
    })
})
  .run(function ($rootScope, $state, $location, $log, $timeout, startupService, ionicToast, fingerprintService, $ionicHistory, $ionicPlatform, $window, appConfigService, lodash, platformInfo, profileService, uxLanguage, gettextCatalog, openURLService, storageService, scannerService, configService, emailService, /* plugins START HERE => */ applicationService) {
    uxLanguage.init()
    applicationService.init()

    $ionicPlatform.ready(function () {
      if (screen.width < 768 && platformInfo.isCordova) {
        var lockOrientation = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation || screen.orientation.lock
        if (lockOrientation) {
          lockOrientation('portrait')
        }
      }

      if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard && !platformInfo.isWP) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false)
        cordova.plugins.Keyboard.disableScroll(true)
      }

      window.addEventListener('native.keyboardshow', function () {
        document.body.classList.add('keyboard-open')
      })

      $ionicPlatform.registerBackButtonAction(function (e) {
        // from root tabs view
        var matchHome = $ionicHistory.currentStateName() === 'tabs.home'
        var matchReceive = $ionicHistory.currentStateName() === 'tabs.receive'
        var matchScan = $ionicHistory.currentStateName() === 'tabs.scan'
        var matchSend = $ionicHistory.currentStateName() === 'tabs.send'
        var matchSettings = $ionicHistory.currentStateName() === 'tabs.settings'

        var fromTabs = matchHome | matchReceive | matchScan | matchSend | matchSettings

        // onboarding with no back views
        var matchWelcome = $ionicHistory.currentStateName() === 'onboarding.welcome'
        var matchBackupRequest = $ionicHistory.currentStateName() === 'onboarding.backupRequest'
        var matchCreatePassword = $ionicHistory.currentStateName() === 'onboarding.createPassword'
        var backedUp = $ionicHistory.backView().stateName === 'onboarding.backup'
        var noBackView = $ionicHistory.backView().stateName === 'starting'
        var matchDisclaimer = !!($ionicHistory.currentStateName() === 'onboarding.disclaimer' && (backedUp || noBackView))

        var fromOnboarding = matchBackupRequest | matchCreatePassword | matchWelcome | matchDisclaimer

        // views with disable backbutton
        var matchComplete = $ionicHistory.currentStateName() === 'tabs.rate.complete'
        var matchLockedView = $ionicHistory.currentStateName() === 'lockedView'
        var matchPin = $ionicHistory.currentStateName() === 'pin'

        if ($ionicHistory.backView() && !fromTabs && !fromOnboarding && !matchComplete && !matchPin && !matchLockedView) {
          $ionicHistory.goBack()
        } else
        if ($rootScope.backButtonPressedOnceToExit) {
          navigator.app.exitApp()
        } else {
          $rootScope.backButtonPressedOnceToExit = true
          $rootScope.$apply(function () {
            ionicToast.show(gettextCatalog.getString('Press again to exit'), 'bottom', false, 1000)
          })
          $timeout(function () {
            $rootScope.backButtonPressedOnceToExit = false
          }, 3000)
        }
        e.preventDefault()
      }, 101)

      $ionicPlatform.on('pause', function () {
        // BCB wallet is going to background
        applicationService.lockBackground()
      })

      $ionicPlatform.on('resume', function () {
        // We may need to change lock depending on time passed in background
        applicationService.verifyLock()
      })

      $ionicPlatform.on('menubutton', function () {
        window.location = '#/preferences'
      })

      $log.info('Init profile...')
      // Try to open local profile
      profileService.loadAndBindProfile(function (err) {
        $ionicHistory.nextViewOptions({
          disableAnimate: true
        })
        if (err) {
          if (err.message && err.message.match('NOPROFILE')) {
            $log.debug('No profile... redirecting')
            $state.go('onboarding.welcome')
          } else if (err.message && err.message.match('NONAGREEDDISCLAIMER')) {
            if (profileService.getWallet() === null) {
              $log.debug('No wallet and no disclaimer... redirecting')
              $state.go('onboarding.welcome')
            } else {
              $log.debug('Display disclaimer... redirecting')
              $state.go('onboarding.disclaimer', {
                resume: true
              })
            }
          } else {
            throw new Error(err) // TODO
          }
        } else {
          $log.debug('Profile loaded ... Starting UX.')
          scannerService.gentleInitialize()
          // Reload tab-home if necessary (from root path: starting)
          $state.go('starting', {}, {
            'reload': true,
            'notify': $state.current.name !== 'starting'
          }).then(function () {
            $ionicHistory.nextViewOptions({
              disableAnimate: true,
              historyRoot: true
            })
            $state.transitionTo('tabs.home').then(function () {
              // Clear history
              $ionicHistory.clearHistory()
            })
            applicationService.lockStartup()
          })
        }
        // After everything have been loaded
        $timeout(function () {
          $log.debug('Before emailService.init')
          emailService.init() // Update email subscription if necessary
          $log.debug('Before openURLService.init')
          openURLService.init()
          $log.debug('After openURLService.init')
        }, 1000)
      })
    })

    if (platformInfo.isNW) {
      nwPrivacyConfig()
      var gui = require('nw.gui')
      var win = gui.Window.get()
      var nativeMenuBar = new gui.Menu({
        type: 'menubar'
      })
      try {
        nativeMenuBar.createMacBuiltin(appConfigService.nameCase)
        win.menu = nativeMenuBar
      } catch (e) {
        $log.debug('This is not OSX')
        win.menu = null
      }
    }

    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      $log.debug('Route change from:', fromState.name || '-', ' to:', toState.name)
      $log.debug('            toParams:' + JSON.stringify(toParams || {}))
      $log.debug('            fromParams:' + JSON.stringify(fromParams || {}))
    })
  })

'use strict'

angular.module('canoeApp.directives')
  .directive('accountSelector', function ($timeout) {
    return {
      restrict: 'E',
      templateUrl: 'views/includes/accountSelector.html',
      transclude: true,
      scope: {
        title: '=accountSelectorTitle',
        show: '=accountSelectorShow',
        accounts: '=accountSelectorAccounts',
        selectedAccount: '=accountSelectorSelectedAccount',
        onSelect: '=accountSelectorOnSelect'
      },
      link: function (scope, element, attrs) {
        scope.hide = function () {
          scope.show = false
        }
        scope.selectAccount = function (account) {
          $timeout(function () {
            scope.hide()
          }, 100)
          scope.onSelect(account)
        }
      }
    }
  })

'use strict';

angular.module('canoeApp.directives')
  .directive('actionSheet', function($rootScope, $timeout) {
    return {
      restrict: 'E',
      templateUrl: 'views/includes/actionSheet.html',
      transclude: true,
      scope: {
        show: '=actionSheetShow',
      },
      link: function(scope, element, attrs) {
        scope.$watch('show', function() {
          if (scope.show) {
            $timeout(function() {
              scope.revealMenu = true;
            }, 100);
          } else {
            scope.revealMenu = false;
          }
        });
        scope.hide = function() {
          scope.show = false;
          $rootScope.$broadcast('incomingDataMenu.menuHidden');
        };
      }
    };
  });

'use strict';

angular.module('canoeApp.directives')
  .directive('clickToAccept', function() {
    return {
      restrict: 'E',
      templateUrl: 'views/includes/clickToAccept.html',
      transclude: true,
      scope: {
        sendStatus: '=clickSendStatus',
        isDisabled: '=isDisabled',
      },
      link: function(scope, element, attrs) {
        scope.$watch('sendStatus', function() {
          if (scope.sendStatus !== 'success') {
            scope.displaySendStatus = scope.sendStatus;
          }
        });
      }
    };
  });

'use strict';

angular.module('canoeApp.directives')
  .directive('copyToClipboard', function(platformInfo, nodeWebkitService, gettextCatalog, ionicToast, clipboard) {
    return {
      restrict: 'A',
      scope: {
        copyToClipboard: '=copyToClipboard'
      },
      link: function(scope, elem, attrs, ctrl) {
        var isCordova = platformInfo.isCordova;
        var isChromeApp = platformInfo.isChromeApp;
        var isNW = platformInfo.isNW;
        elem.bind('mouseover', function() {
          elem.css('cursor', 'pointer');
        });

        var msg = gettextCatalog.getString('Copied to clipboard');
        elem.bind('click', function() {
          var data = scope.copyToClipboard;
          if (!data) return;

          if (isCordova) {
            cordova.plugins.clipboard.copy(data);
          } else if (isNW) {
            nodeWebkitService.writeToClipboard(data);
          } else if (clipboard.supported) {
            clipboard.copyText(data);
          } else {
            // No supported
            return;
          }
          scope.$apply(function() {
            ionicToast.show(msg, 'bottom', false, 1000);
          });
        });
      }
    }
  });

'use strict';

angular.module('canoeApp.directives')
  .directive('timer', function() {
    return {
      restrict: 'EAC',
      replace: false,
      scope: {
        countdown: "=",
        interval: "=",
        active: "=",
        onZeroCallback: "="
      },
      template:"{{formatted}}",
      controller: function ($scope, $attrs, $timeout, lodash) {
        $scope.format = $attrs.outputFormat;

        var queueTick = function () {
          $scope.timer = $timeout(function () {
            if ($scope.countdown > 0) {
              $scope.countdown -= 1;

              if ($scope.countdown > 0) {
                queueTick();
              } else {
                $scope.countdown = 0;
                $scope.active = false;
                if (!lodash.isUndefined($scope.onZeroCallback)) {
                  $scope.onZeroCallback();
                }
              }
            }
          }, $scope.interval);
        };

        if ($scope.active) {
          queueTick();
        }

        $scope.$watch('active', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            if (newValue === true) {
              if ($scope.countdown > 0) {
                queueTick();
              } else {
                $scope.active = false;
              }
            } else {
              $timeout.cancel($scope.timer);
            }
          }
        });
        $scope.$watch('countdown', function () {
          updateFormatted();
        });

        var updateFormatted = function () {
          $scope.formatted = moment($scope.countdown * $scope.interval).format($scope.format);
        };
        updateFormatted();

        $scope.$on('$destroy', function () {
          $timeout.cancel($scope.timer);
        });
      }
    };
  });

'use strict'
/* global angular */
angular.module('canoeApp.directives')
  .directive('validAddress', ['$rootScope', 'nanoService',
    function ($rootScope, nanoService) {
      return {
        require: 'ngModel',
        link: function (scope, elem, attrs, ctrl) {
          var validator = function (value) {
            // Regular url
            if (/^https?:\/\//.test(value)) {
              ctrl.$setValidity('validAddress', true)
              return value
            }

            // Regular Address
            var isValid = nanoService.isValidAccount(value)
            ctrl.$setValidity('validAddress', isValid)
            return value
          }

          ctrl.$parsers.unshift(validator)
          ctrl.$formatters.unshift(validator)
        }
      }
    }
  ])
  .directive('validAmount', ['configService',
    function (configService) {
      return {
        require: 'ngModel',
        link: function (scope, element, attrs, ctrl) {
          var val = function (value) {
            var settings = configService.getSync().wallet.settings
            var vNum = Number((value * settings.unitToRaw).toFixed(0))
            if (typeof value === 'undefined' || value === 0) {
              ctrl.$pristine = true
            }

            if (typeof vNum === 'number' && vNum > 0) {
              if (vNum > Number.MAX_SAFE_INTEGER) {
                ctrl.$setValidity('validAmount', false)
              } else {
                var decimals = Number(settings.unitDecimals)
                var sepIndex = ('' + value).indexOf('.')
                var strValue = ('' + value).substring(sepIndex + 1)
                if (sepIndex >= 0 && strValue.length > decimals) {
                  ctrl.$setValidity('validAmount', false)
                  return
                } else {
                  ctrl.$setValidity('validAmount', true)
                }
              }
            } else {
              ctrl.$setValidity('validAmount', false)
            }
            return value
          }
          ctrl.$parsers.unshift(val)
          ctrl.$formatters.unshift(val)
        }
      }
    }
  ])
  .directive('walletSecret', function (bitcore) {
    return {
      require: 'ngModel',
      link: function (scope, elem, attrs, ctrl) {
        var validator = function (value) {
          if (value.length > 0) {
            var m = value.match(/^[0-9A-HJ-NP-Za-km-z]{70,80}$/)
            ctrl.$setValidity('walletSecret', !!m)
          }
          return value
        };

        ctrl.$parsers.unshift(validator)
      }
    }
  })
  .directive('ngFileSelect', function () {
    return {
      link: function ($scope, el) {
        el.bind('change', function (e) {
          $scope.formData.file = (e.srcElement || e.target).files[0]
          $scope.getFile()
        })
      }
    }
  })
  .directive('contact', ['addressbookService', 'lodash',
    function (addressbookService, lodash) {
      return {
        restrict: 'E',
        link: function (scope, element, attrs) {
          var addr = attrs.address
          addressbookService.get(addr, function (err, ab) {
            if (ab) {
              var name = lodash.isObject(ab) ? ab.name : ab
              element.append(name)
            } else {
              element.append(addr)
            }
          })
        }
      }
    }
  ])
  .directive('ignoreMouseWheel', function ($rootScope, $timeout) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.bind('mousewheel', function (event) {
          element[0].blur()
          $timeout(function () {
            element[0].focus()
          }, 1)
        })
      }
    }
  })

'use strict';

angular.module('canoeApp.directives')
  .directive('gravatar', function(md5) {
    return {
      restrict: 'AE',
      replace: true,
      scope: {
        name: '@',
        height: '@',
        width: '@',
        email: '@'
      },
      link: function(scope, el, attr) {
        if (typeof scope.email === "string") {
          scope.emailHash = md5.createHash(scope.email.toLowerCase() || '');
        }
      },
      template: '<img class="gravatar" alt="{{ name }}" height="{{ height }}"  width="{{ width }}" src="img/app/icon.png">'
    };
  });

'use strict';
angular.module('canoeApp.directives')
.directive('hideTabs', function($rootScope, $timeout) {
  return {
    restrict: 'A',
    link: function($scope, $el) {
      $scope.$on("$ionicView.beforeEnter", function(event, data){
        $timeout(function() {
          $rootScope.hideTabs = 'tabs-item-hide';
          $rootScope.$apply();
        });
      });
    }
  };
});

'use strict'
/* global angular */
angular.module('canoeApp.directives')
  .directive('incomingDataMenu', function ($timeout, $rootScope, $state, externalLinkService) {
    return {
      restrict: 'E',
      templateUrl: 'views/includes/incomingDataMenu.html',
      link: function (scope, element, attrs) {
        $rootScope.$on('incomingDataMenu.showMenu', function (event, data) {
          $timeout(function () {
            scope.data = data.data
            scope.type = data.type
            scope.showMenu = true
            scope.https = false

            if (scope.type === 'url') {
              if (scope.data.indexOf('https://') === 0) {
                scope.https = true
              }
            }
          })
        })
        scope.hide = function () {
          scope.showMenu = false
          $rootScope.$broadcast('incomingDataMenu.menuHidden')
        };
        scope.goToUrl = function (url) {
          externalLinkService.open(url)
        };
        scope.sendPaymentToAddress = function (nanoAccount) {
          scope.showMenu = false
          $state.go('tabs.send').then(function () {
            $timeout(function () {
              $state.transitionTo('tabs.send.amount', {
                toAddress: nanoAccount
              })
            }, 50)
          })
        };
        scope.addToAddressBook = function (nanoAccount) {
          scope.showMenu = false
          $timeout(function () {
            $state.go('tabs.send').then(function () {
              $timeout(function () {
                $state.transitionTo('tabs.send.addressbook', {
                  addressbookEntry: nanoAccount
                })
              })
            })
          }, 100)
        };
        scope.scanPaperWallet = function (privateKey) {
          scope.showMenu = false
          $state.go('tabs.home').then(function () {
            $timeout(function () {
              $state.transitionTo('tabs.home.paperWallet', {
                privateKey: privateKey
              })
            }, 50)
          })
        };
      }
    }
  })

'use strict';

angular.module('canoeApp.directives')
  .directive('itemSelector', function($timeout) {
    return {
      restrict: 'E',
      templateUrl: 'views/includes/itemSelector.html',
      transclude: true,
      scope: {
        show: '=itemSelectorShow',
        onSelect: '=itemSelectorOnSelect'
      },
      link: function(scope, element, attrs) {
        scope.hide = function() {
          scope.show = false;
        };
        scope.sendMax = function() {
          $timeout(function() {
            scope.hide();
          }, 100);
          scope.onSelect();
        };
      }
    };
  });

'use strict';

angular.module('canoeApp.directives')
  .directive('logOptions', function($timeout, platformInfo) {
    return {
      restrict: 'E',
      templateUrl: 'views/includes/logOptions.html',
      transclude: true,
      scope: {
        show: '=logOptionsShow',
        options: '=logOptions',
        fillClass: '=logOptionsFillClass',
        onSelect: '=logOptionsOnSelect',
        onCopy: '=logOptionsOnCopy',
        onSend: '=logOptionsOnSend'
      },
      link: function(scope, element, attrs) {
        scope.isCordova = platformInfo.isCordova;

        scope.hide = function() {
          scope.show = false;
        };

        scope.getFillClass = function(index) {
          scope.onSelect(index);
        };
      }
    };
  });

'use strict'
/* global angular */
angular.module('canoeApp.directives')
  .directive('qrScanner', function ($state, $rootScope, $log, $ionicHistory, platformInfo, scannerService, gettextCatalog, popupService) {
    return {
      restrict: 'E',
      scope: {
        onScan: '&'
      },
      replace: true,
      template: '<a on-tap="chooseScanner()" nav-transition="none"><i class="icon ion-qr-scanner"></i></a>',
      link: function (scope, el, attrs) {
        scope.chooseScanner = function () {
          var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

          if (!isWindowsPhoneApp) {
            scope.openScanner()
            return
          }

          scannerService.useOldScanner(function (err, contents) {
            if (err) {
              popupService.showAlert(gettextCatalog.getString('Error'), err)
              return
            }
            scope.onScan({
              data: contents
            })
          })
        }

        scope.openScanner = function () {
          $log.debug('Opening scanner by directive...')
          $ionicHistory.nextViewOptions({
            disableAnimate: true
          })
          $state.go('scanner', {
            passthroughMode: 1
          })
        }

        var afterEnter = $rootScope.$on('$ionicView.afterEnter', function () {
          if ($rootScope.scanResult) {
            scope.onScan({
              data: $rootScope.scanResult
            })
            $rootScope.scanResult = null
          }
        })

        // Destroy event
        scope.$on('$destroy', function () {
          afterEnter()
        })
      }
    }
  })

'use strict';
angular.module('canoeApp.directives')
  .directive('showTabs', function($rootScope, $timeout) {
    return {
      restrict: 'A',
      link: function($scope, $el) {
        $scope.$on("$ionicView.beforeEnter", function(event, data) {
          $timeout(function() {
            $rootScope.hideTabs = '';
            $rootScope.$apply();
          });
        });
      }
    };
  });

'use strict';

angular.module('canoeApp.directives')
  .directive('slideToAccept', function($timeout, $window, $q) {
    return {
      restrict: 'E',
      templateUrl: 'views/includes/slideToAccept.html',
      transclude: true,
      scope: {
        sendStatus: '=slideSendStatus',
        onConfirm: '&slideOnConfirm',
        isDisabled: '=isDisabled'
      },
      link: function(scope, element, attrs) {

        var KNOB_WIDTH = 71;
        var MAX_SLIDE_START_PERCENTAGE = 50;
        var FULLY_SLID_PERCENTAGE = 72;
        var PERCENTAGE_BUMP = 5;
        var JIGGLE_EASING = linear;
        var JIGGLE_DURATION = 100;
        var RECEDE_DURATION = 250;
        var INITIAL_TAP_EASE_DURATION = 75;

        var elm = element[0];
        var isSliding = false;
        var curSliderPct = getKnobWidthPercentage();
        var curBitcoinPct = 0;
        var curTextPct = 0;
        var currentEaseStartTime;
        var bezier = $window.BezierEasing(0.175, 0.885, 0.320, 1.275);

        scope.isSlidFully = false;
        scope.displaySendStatus = '';

        scope.$watch('sendStatus', function() {
          if (!scope.sendStatus) {
            reset();
          } else if (scope.sendStatus === 'success') {
            scope.displaySendStatus = '';
            $timeout(function() {
              reset();
            }, 500);
          } else {
            scope.displaySendStatus = scope.sendStatus;
          }
        });

        function easePosition(fromPct, pct, duration, easeFx, animateFx) {
          var deferred = $q.defer();
          currentEaseStartTime = Date.now();
          var startTime = currentEaseStartTime;
          var initialPct = fromPct;
          var distance = pct - fromPct;

          function ease() {
            if (startTime !== currentEaseStartTime) {
              return;
            }
            $window.requestAnimationFrame(function() {
              var now = Date.now();
              var elapsed = now - startTime;
              var normalizedElapsedTime = elapsed / duration;
              var newVal = easeFx(normalizedElapsedTime);
              var newPct = newVal * distance + initialPct;
              animateFx(newPct);
              scope.$digest();
              if (elapsed < duration) {
                ease();
              } else {
                deferred.resolve();
              }
            });
          }
          ease();
          return deferred.promise;
        }

        function linear(t) {
          return t;
        }

        function easeInOutBack(t) {
          return bezier(t);
        }

        function reset() {
          scope.isSlidFully = false;
          isSliding = false;
          setNewSliderStyle(getKnobWidthPercentage());
          setNewBitcoinStyle(0);
          setNewTextStyle(0);
        }

        function setNewSliderStyle(pct) {
          var knobWidthPct = getKnobWidthPercentage();
          var translatePct = pct - knobWidthPct;
          if (isSliding) {
            translatePct += 0.35 * pct;
          }
          scope.sliderStyle = getTransformStyle(translatePct);
          curSliderPct = pct;
        }

        function setNewBitcoinStyle(pct) {
          var translatePct = -2.25 * pct;
          scope.bitcoinStyle = getTransformStyle(translatePct);
          curBitcoinPct = pct;
        }

        function setNewTextStyle(pct) {
          var translatePct = -0.1 * pct;
          scope.textStyle = getTransformStyle(translatePct);
          curTextPct = pct;
        }

        function getTransformStyle(translatePct) {
          return {
            'transform': 'translateX(' + translatePct + '%)'
          };
        }

        function getKnobWidthPercentage() {
          var knobWidthPct = (KNOB_WIDTH / elm.clientWidth) * 100;
          return knobWidthPct;
        }

        function setSliderPosition(pct) {
          setNewSliderStyle(pct);
          setNewBitcoinStyle(pct);
          setNewTextStyle(pct);
        }

        function easeSliderPosition(pct) {
          var duration = INITIAL_TAP_EASE_DURATION;
          easePosition(curSliderPct, pct, duration, JIGGLE_EASING, function(pct) {
            setNewSliderStyle(pct);
          });
          easePosition(curBitcoinPct, pct, duration, JIGGLE_EASING, function(pct) {
            setNewBitcoinStyle(pct);
          });
          easePosition(curTextPct, pct, duration, JIGGLE_EASING, function(pct) {
            setNewTextStyle(pct);
          });
        }

        function jiggleSlider() {
          var pct = getKnobWidthPercentage() + PERCENTAGE_BUMP;
          var duration = JIGGLE_DURATION;
          var p1 = easePosition(curSliderPct, pct, duration, JIGGLE_EASING, function(pct) {
            setNewSliderStyle(pct);
          });
          var p2 = easePosition(curBitcoinPct, pct, duration, JIGGLE_EASING, function(pct) {
            setNewBitcoinStyle(pct);
          });

          $q.all([p1, p2]).then(function() {
            recede();
          });
        }

        function recede() {
          var duration = RECEDE_DURATION;
          easePosition(curSliderPct, getKnobWidthPercentage(), duration, easeInOutBack, function(pct) {
            setNewSliderStyle(pct);
          });
          easePosition(curBitcoinPct, 0, duration, easeInOutBack, function(pct) {
            setNewBitcoinStyle(pct);
          });
          easePosition(curTextPct, 0, duration, easeInOutBack, function(pct) {
            setNewTextStyle(pct);
          });
        }

        function alertSlidFully() {
          scope.isSlidFully = true;
          scope.onConfirm();
        }

        function getTouchXPosition($event) {
          var x;
          if ($event.touches || $event.changedTouches) {
            if ($event.touches.length) {
              x = $event.touches[0].clientX;
            } else {
              x = $event.changedTouches[0].clientX;
            }
          } else {
            x = $event.clientX;
          }
          return x;
        }

        function getSlidPercentage($event) {
          var x = getTouchXPosition($event);
          var width = elm.clientWidth;
          var pct = (x / width) * 100;
          if (x >= width) {
            pct = 100;
          }
          return pct;
        }

        scope.onTouchstart = function($event) {
          if (scope.isSlidFully) {
            return;
          }
          if (!isSliding) {
            var pct = getSlidPercentage($event);
            if (pct > MAX_SLIDE_START_PERCENTAGE) {
              jiggleSlider();
              return;
            } else {
              isSliding = true;
              var knobWidthPct = getKnobWidthPercentage();
              if (pct < knobWidthPct) {
                pct = knobWidthPct;
              }
              pct += PERCENTAGE_BUMP;
              easeSliderPosition(pct);
            }
          }
        };

        scope.onTouchmove = function($event) {
          if (!isSliding || scope.isSlidFully) {
            return;
          }
          var pct = getSlidPercentage($event);
          var knobWidthPct = getKnobWidthPercentage();
          if (pct < knobWidthPct) {
            pct = knobWidthPct;
          }
          pct += PERCENTAGE_BUMP;
          currentEaseStartTime = null;
          setSliderPosition(pct);
        };

        scope.onTouchend = function($event) {
          if (scope.isSlidFully) {
            return;
          }
          var pct = getSlidPercentage($event);
          if (isSliding && pct > FULLY_SLID_PERCENTAGE) {
            pct = 100;
            setSliderPosition(pct);
            alertSlidFully();
          } else {
            recede();
          }
          isSliding = false;
        };
      }
    };
  });

'use strict';

angular.module('canoeApp.directives')
  .directive('slideToAcceptSuccess', function($timeout, platformInfo) {
    return {
      restrict: 'E',
      templateUrl: 'views/includes/slideToAcceptSuccess.html',
      transclude: true,
      scope: {
        isShown: '=slideSuccessShow',
        onConfirm: '&slideSuccessOnConfirm',
        hideOnConfirm: '=slideSuccessHideOnConfirm'
      },
      link: function(scope, element, attrs) {

        scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP;

        var elm = element[0];
        elm.style.display = 'none';
        scope.$watch('isShown', function() {
          if (scope.isShown) {
            elm.style.display = 'flex';
            $timeout(function() {
              scope.fillScreen = true;
            }, 10);
          }
        });
        scope.onConfirmButtonClick = function() {
          scope.onConfirm();
          if (scope.hideOnConfirm) {
            scope.fillScreen = false;
            elm.style.display = 'none';
          }
        };
      }
    };
  });

'use strict';

angular.module('canoeApp.directives')
  /**
   * Replaces img tag with its svg content to allow for CSS styling of the svg.
   */
  .directive('svg', function($http) {
    return {
      restrict: 'C',
      link: function(scope, element, attrs) {
        var imgId = attrs.id;
        var imgClass = attrs.class;
        var imgUrl = attrs.src || attrs.ngSrc;
        var svg;

        // Load svg content
        $http.get(imgUrl).success(function(data, status) {
          svg = angular.element(data);
          for (var i = svg.length - 1; i >= 0; i--) {
            if (svg[i].constructor == SVGSVGElement) {
              svg = angular.element(svg[i]);
              break;
            }
          }

          if (typeof imgId !== 'undefined') {
            svg.attr('id', imgId);
          }

          if (typeof imgClass !== 'undefined') {
            svg.attr('class', imgClass);
          }
          // Remove invalid attributes
          svg = svg.removeAttr('xmlns:a');
          element.replaceWith(svg);
        });

        scope.$on('$destroy', function() {
          if (svg) svg.remove();
        });
      }
    };
  });
    
'use strict'
/* global angular */
angular.module('canoeApp.filters', [])
  .filter('amTimeAgo', ['amMoment',
    function (amMoment) {
      return function (input) {
        return amMoment.preprocessDate(input).fromNow()
      }
    }
  ])
  .filter('paged', function () {
    return function (elements) {
      if (elements) {
        return elements.filter(Boolean)
      }

      return false
    }
  })
  .filter('removeEmpty', function () {
    return function (elements) {
      elements = elements || []
      // Hide empty change addresses from other canoeers
      return elements.filter(function (e) {
        return !e.isChange || e.balance > 0
      })
    }
  })
  .filter('formatFiatAmount', ['$filter', '$locale', 'configService',
    function (filter, locale) {
      var numberFilter = filter('number')
      var formats = locale.NUMBER_FORMATS
      return function (amount) {
        var fractionSize = 2
        var value = numberFilter(amount, fractionSize)
        var sep = value.indexOf(formats.DECIMAL_SEP)
        var group = value.indexOf(formats.GROUP_SEP)

        if (amount >= 0) {
          if (group > 0) {
            if (sep < 0) {
              return value
            }
            var intValue = value.substring(0, sep)
            var floatValue = parseFloat(value.substring(sep))
            floatValue = floatValue.toFixed(2)
            floatValue = floatValue.toString().substring(1)
            var finalValue = intValue + floatValue
            return finalValue
          } else {
            value = parseFloat(value)
            return value.toFixed(2)
          }
        }
        return 0
      }
    }
  ])
  .filter('orderObjectBy', function () {
    return function (items, field, reverse) {
      var filtered = []
      angular.forEach(items, function (item) {
        filtered.push(item)
      })
      filtered.sort(function (a, b) {
        return (a[field] > b[field] ? 1 : -1)
      })
      if (reverse) filtered.reverse()
      return filtered
    }
  })
  .filter('range', function () {
    return function (input, total) {
      total = parseInt(total)
      for (var i = 0; i < total; i++) {
        input.push(i)
      }
      return input
    }
  })

'use strict'
/* global getUUID */
/**
 * Profile
 */
function Profile () {
  this.version = '1.0.0'
}

Profile.create = function (opts) {
  opts = opts || {}
  var x = new Profile()
  x.createdOn = Date.now()
  x.id = getUUID()
  x.walletId = null
  x.disclaimerAccepted = false
  return x
}

Profile.fromObj = function (obj) {
  var x = new Profile()
  x.createdOn = obj.createdOn
  x.id = obj.id
  x.walletId = obj.id
  x.disclaimerAccepted = obj.disclaimerAccepted
  return x
}

Profile.fromString = function (str) {
  return Profile.fromObj(JSON.parse(str))
}

Profile.prototype.toObj = function () {
  return JSON.stringify(this)
}

'use strict'
/* global angular */
angular.module('canoeApp.services').factory('addressbookService', function ($log, nanoService, storageService, lodash) {
  var root = {}

  // We initialize with this entry added
  // var DONATE_ADDRESS = 'bcb_3cpc75h3igq5go1ubq9iaq3uxe7taramup7mwrmkmq76bo9rqnemja9ziigi'
  var DONATE_ADDRESS = ''
  var DONATE_ENTRY = {}
  // var DONATE_ENTRY = {
  //   name: 'Donate to BCB',
  //   email: 'donate@bitcoin.black',
  //   address: DONATE_ADDRESS,
  //   alias: {
  //     'id': 1,
  //     // "alias": "canoe",
  //     'address': 'bcb_3cpc75h3igq5go1ubq9iaq3uxe7taramup7mwrmkmq76bo9rqnemja9ziigi',
  //     'listed': true,
  //     'verified': false,
  //     'signature': '3EEB693EC4F28655518FB7EC804B730203DC2D3C4CF316BE492242CCFFC0294B22DD020D0AA9F7640D90B0876B6F3A55B60F0DF7F3D32F448ABEBA3F23D86F01',
  //     'createdAt': '2018-02-28T05:29:00.367Z',
  //     'updatedAt': '2018-03-01T05:55:13.511Z',
  //     'avatar': 'iVBORw0KGgoAAAANSUhEUgAAAEYAAABGCAMAAABG8BK2AAAABGdBTUEAALGPC/xhBQAAABJ0RVh0U29mdHdhcmUASmRlbnRpY29um8oJfgAAAHtQTFRFAAAATExMTExMTExMnMxmnMxmnMxmTExMTExMTExMnMxmnMxmnMxmTExMTExMnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmnMxmb+LL+QAAACl0Uk5TACa/GSa/GeX/2OX/2MyyzLIsmRPrbAbSP6wf+H+MZlml8kzfcjMMklJnT9lcAAABrElEQVR4nO2X2VaEMAyGowIiVWcBGRxwFsft/Z9QKEtD2mR6Ub0iN0Pm//JT2qbnFGCJf4yb2zucRnEipARGwn36gKQoU48JmxJ4JqRIassUKiQpgYmLkXSZKSQpgS2XURrKxkKSEtjh0ktTWV9IUgI7XToJlXWFJCUwsnlKcTyvFI41SQkcfjSB5ibUSoXaN6F2caieCtXhFASI+3n1gydhPuw2NryNDRtBUWnL2bhgI1ApL9w2ThgJVHpx2jCwtd2nKHcOGw4G0nxIqWwbHiZHAS56tWx4mH8B7Ou5TRQLMPu5AA22yd/awQkwO/lQZub5UOip4mF+K8BxfKhW427kYX5jDpGchiFcgdk20Z/WnBWykWC2aQHeL2ZxrsGTgtaz4ow9DorRpPjgTLwOisFlm0su1w8K/RR/jpL9YX4HRfuTHY22E2GnoCVVN19IVAcJdgudtN7PylSRCzBShIOis1Hf4AULva9t6o0fLPS+nvHYExZ6X6//jycs9H73/6X0hPne1yWNJ8y3ibapEz+Yb9p+Hk5+8HL1WK4ew1GwXD2Wq4d09VjiT+IXBhpFh295OqwAAAAASUVORK5CYII='
  //   }
  // }

  root.getDonate = function (cb) {
    return root.get(DONATE_ADDRESS, cb)
  }

  root.initialize = function (cb) {
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (ab[DONATE_ADDRESS]) return cb('Entry already exist')
      ab[DONATE_ADDRESS] = DONATE_ENTRY
      storageService.setAddressbook(JSON.stringify(ab), function (err, ab) {
        if (err) return cb('Error adding new entry')
        root.list(function (err, ab) {
          return cb(err, ab)
        })
      })
    })
  }

  root.get = function (addr, cb) {
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      if (ab && ab[addr]) return cb(null, ab[addr])
      return cb(null, null)
    })
  }

  root.list = function (cb) {
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb('Could not get the Addressbook')
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      return cb(err, ab)
    })
  }

  root.save = function (entry, oldAddress, cb) {
    if (!nanoService.isValidAccount(entry.address)) return cb('Not valid BCB account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (!ab[oldAddress]) return cb('Old entry does not exist')
      if ((entry.address !== oldAddress) && ab[entry.address]) return cb('Other entry with that BCB account already exists')
      delete ab[oldAddress]
      ab[entry.address] = entry
      storageService.setAddressbook(JSON.stringify(ab), function (err, ab) {
        if (err) return cb('Error saving entry')
        root.list(function (err, ab) {
          return cb(err, ab)
        })
      })
    })
  }

  root.add = function (entry, cb) {
    if (!nanoService.isValidAccount(entry.address)) return cb('Not valid BCB account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isArray(ab)) ab = {} // No array
      if (ab[entry.address]) return cb('Other entry with that BCB account already exists')
      ab[entry.address] = entry
      storageService.setAddressbook(JSON.stringify(ab), function (err, ab) {
        if (err) return cb('Error adding new entry')
        root.list(function (err, ab) {
          return cb(err, ab)
        })
      })
    })
  }

  root.remove = function (addr, cb) {
    if (!nanoService.isValidAccount(addr)) return cb('Not valid BCB account')
    storageService.getAddressbook(function (err, ab) {
      if (err) return cb(err)
      if (ab) ab = JSON.parse(ab)
      ab = ab || {}
      if (lodash.isEmpty(ab)) return cb('Addressbook is empty')
      if (!ab[addr]) return cb('Entry does not exist')
      delete ab[addr]
      storageService.setAddressbook(JSON.stringify(ab), function (err) {
        if (err) return cb('Error deleting entry')
        root.list(function (err, ab) {
          return cb(err, ab)
        })
      })
    })
  }

  root.removeAll = function () {
    storageService.removeAddressbook(function (err) {
      if (err) return cb('Error deleting addressbook')
      return cb()
    })
  }

  return root
})

'use strict'
/* global angular XMLHttpRequest */
angular.module('canoeApp.services')
  .factory('aliasService', function ($log, $rootScope, configService, platformInfo, storageService, gettextCatalog, lodash) {
    var root = {}

    var host = 'https://alias.betawallet.bitcoinblack.info/api'
    // var host = 'https://alias.betawallet.bitcoinblack.info/api-dev' // for dev
    // var host = 'http://localhost:3000' // for local dev

    var timer = null
    /*
    "data": {
      "alias": {
        "id": 3,
        "alias": "canoe",
        "address": "nano_1qckwc5o3obkrwbet4amnkya113xq77qpaknsmiq9hwq31tmd5bpyo7sepsw",
        "listed": true,
        "verified": false,
        "registered": true,
        "createdAt": "2018-02-12T16:27:55.873Z",
        "updatedAt": "2018-02-12T16:27:55.873Z",
        "avatar": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" preserveAspectRatio=\"xMidYMid meet\"><path fill=\"#d8bae8\" d=\"M32 19L19 19L19 6ZM32 19L32 6L45 6ZM32 45L45 45L45 58ZM32 45L32 58L19 58ZM19 32L6 32L6 19ZM45 32L45 19L58 19ZM45 32L58 32L58 45ZM19 32L19 45L6 45Z\"/><path fill=\"#4c4c4c\" d=\"M6 12.5L12.5 6L19 12.5L12.5 19ZM51.5 6L58 12.5L51.5 19L45 12.5ZM58 51.5L51.5 58L45 51.5L51.5 45ZM12.5 58L6 51.5L12.5 45L19 51.5Z\"/><path fill=\"#b275d1\" d=\"M19 19L32 19L32 21.1L26.5 32L19 32ZM45 19L45 32L42.9 32L32 26.5L32 19ZM45 45L32 45L32 42.9L37.5 32L45 32ZM19 45L19 32L21.1 32L32 37.5L32 45Z\"/></svg>"
      }
    }
    */
    root.lookupAlias = function (alias, cb) {
      // If we were already waiting to perform a lookup, clear it
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(function () {
        root.actualLookupAlias(alias, cb)
      }, 500)
    }

    root.lookupAddress = function (address, cb) {
      // If we were already waiting to perform a lookup, clear it
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(function () {
        root.actualLookupAddress(address, cb)
      }, 500)
    }

    root.actualLookupAlias = function (alias, cb) {
      $log.debug('Perform lookup')
      var xhr = new XMLHttpRequest()
      // xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('GET', host + '/alias/' + alias, true)
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Lookup failed') }
      xhr.onload = function () {
        var response
        if (xhr.status === 422) {
          $log.debug('No such alias')
          response = JSON.parse(xhr.responseText)
          cb(response.message)
        } else if (xhr.status === 200) {
          response = JSON.parse(xhr.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data))
            cb(null, response.data)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(null)
    }

    root.actualLookupAddress = function (address, cb) {
      $log.debug('Perform lookup')
      var xhr = new XMLHttpRequest()
      // xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('GET', host + '/address/' + address, true)
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Lookup failed') }
      xhr.onload = function () {
        if (xhr.status === 422) {
          $log.debug('No such address')
          cb('No such address')
        } else if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data))
            cb(null, response.data)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(null)
    }

    root.getAvatar = function (alias, cb) {
      $log.debug('Perform avatar lookup')
      var params = `alias=${alias}&type=png&size=70`
      var xhr = new XMLHttpRequest()
      // xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('POST', host + '/alias/avatar', true)
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Lookup failed') }
      xhr.onload = function () {
        if (xhr.status === 422) {
          $log.debug('No such alias')
          cb('No such alias')
        } else if (xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data.avatar))
            cb(null, response.data.avatar)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(params)
    }

    root.createAlias = function (alias, address, email, isPrivate, signature, cb) {
      $log.debug('Perform Alias Creation')
      var params = `alias=${alias}&address=${address}&email=${email}&listed=${!isPrivate}&signature=${signature}`
      var xhr = new XMLHttpRequest()
      // xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('POST', host + '/alias/create', true)
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Creation failed') }
      xhr.onreadystatechange = function () {
        var response
        if (this.status === 422) {
          response = JSON.parse(this.responseText)
          $log.debug(response.message)
          cb(response.message)
        } else if (this.status === 200) {
          response = JSON.parse(this.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data))
            cb(null, response.data)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(params)
    }

    root.editAlias = function (alias, newAlias, address, email, isPrivate, newSignature, privateSignature, cb) {
      $log.debug('Perform Alias Editing')
      var params = `alias=${alias}&newAlias=${newAlias}&address=${address}&email=${email}&listed=${!isPrivate}&newSignature=${newSignature}&privateSignature=${privateSignature}`
      var xhr = new XMLHttpRequest()
      // xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.withCredentials = false
      xhr.open('POST', host + '/alias/edit', true)
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.onerror = xhr.onabort = xhr.ontimeout = function () { cb('Editing failed') }
      xhr.onreadystatechange = function () {
        var response
        if (this.status === 422) {
          response = JSON.parse(this.responseText)
          $log.debug(response.message)
          cb(response.message)
        } else if (this.status === 200) {
          response = JSON.parse(this.responseText)
          if (response.status === 'SUCCESS') {
            $log.debug('Success: ' + JSON.stringify(response.data))
            cb(null, response.data)
          } else if (response.status === 'ERROR') {
            $log.debug('Error: ' + JSON.stringify(response.message))
            cb(response.message)
          }
        } else {
          cb(xhr.status)
        }
      }
      xhr.send(params)
    }

    return root
  })
'use strict';

angular.module('canoeApp.services').factory('appConfigService', function($window) {
  return $window.appConfig;
});

'use strict'
/* global angular chrome */
angular.module('canoeApp.services')
  .factory('applicationService', function ($rootScope, $state, $timeout, $ionicHistory, $ionicModal, $log, platformInfo, fingerprintService, openURLService, profileService, configService, Idle) {
    var root = {}

    // Current type of modal open, null if not open
    root.openModalType = null       // Type of current modal opened
    root.waitingForSoft = true      // True if we had a soft timeout
    root.backgroundTimestamp = null // When app went to background
    root.idleTimestamp = null       // When idle timeout was reached NOT USED

    // Configuration filled in by root.configureLock()
    root.timeoutSoft = null
    root.lockTypeSoft = null
    root.timeoutHard = null
    root.lockTypeBackground = null

    // Different behaviors on different platforms
    var isChromeApp = platformInfo.isChromeApp
    var isNW = platformInfo.isNW

    // Events via ngIdle to detect idleness
    $rootScope.$on('IdleStart', function () {
      root.idleTimestamp = new Date()
      $log.debug('Idle ' + (root.waitingForSoft ? 'soft' : 'hard') + ' timeout detected at: ' + new Date())
    })

    // User started doing something again
    $rootScope.$on('IdleEnd', function () {
      root.idleTimestamp = null
      // If we were waiting for hard, we switch back to soft
      if (!root.waitingForSoft) {
        root.startWaitingForSoft()
      }
    })

    $rootScope.$on('IdleTimeout', function () {
      root.idleTimestamp = null
      // Was this a soft timeout?
      if (root.waitingForSoft) {
        root.startWaitingForHard()
        root.lockSoft()
      } else {
        root.lockHard()
      }
    })

    // Make sure we have proper configuration
    root.init = function () {
      configService.whenAvailable(function (config) {
        root.configureLock(config.wallet)
      })
    }

    // Called whenever lock settings are modified or on startup
    root.configureLock = function (obj) {
      var settings = obj || configService.getSync().wallet
      root.timeoutSoft = settings.timeoutSoft
      root.lockTypeSoft = settings.lockTypeSoft
      root.timeoutHard = settings.timeoutHard
      root.lockTypeBackground = settings.lockTypeBackground
      root.startWaitingForSoft()
    }

    root.startWaitingForSoft = function () {
      root.waitingForSoft = true
      $log.debug('Waiting for soft timeout: ' + root.timeoutSoft)
      Idle.setIdle(root.timeoutSoft)
      Idle.setTimeout(1)
      Idle.watch()
    }

    root.startWaitingForHard = function () {
      root.waitingForSoft = false
      $log.debug('Waiting for hard timeout: ' + root.timeoutHard)
      Idle.setIdle(root.timeoutHard)
      Idle.setTimeout(1)
      Idle.watch()
    }

    root.restart = function () {
      var hashIndex = window.location.href.indexOf('#/')
      if (platformInfo.isCordova) {
        window.location = window.location.href.substr(0, hashIndex)
        $timeout(function () {
          $rootScope.$digest()
        }, 1)
      } else {
        // Go home reloading the application
        if (isChromeApp) {
          chrome.runtime.reload()
        } else if (isNW) {
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
          $timeout(function () {
            var win = require('nw.gui').Window.get()
            win.menu = null // Make sure we have no menubar
            win.reload(3)
            // or
            win.reloadDev()
          }, 100)
        } else {
          window.location = window.location.href.substr(0, hashIndex)
        }
      }
    }

    root.fingerprintModal = function () {
      var scope = $rootScope.$new(true)
      $ionicModal.fromTemplateUrl('views/modals/fingerprintCheck.html', {
        scope: scope,
        animation: 'none',
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        scope.fingerprintCheckModal = modal
        root.openModalType = 'fingerprint'
        scope.openModal()
      })
      scope.openModal = function () {
        scope.fingerprintCheckModal.show()
        scope.checkFingerprint()
      }
      root.hideModal = scope.hideModal = function () {
        root.openModalType = null
        scope.fingerprintCheckModal.hide()
        root.startWaitingForSoft()
      }
      scope.checkFingerprint = function () {
        fingerprintService.check('unlockingApp', function (err) {
          if (err) return
          $timeout(function () {
            scope.hideModal()
          }, 200)
        })
      }
    }

    root.passwordModal = function (action) {
      // Remove wallet from RAM
      if (profileService.getWallet()) {
        $log.debug('Unloading wallet')
        profileService.unloadWallet()
      }
      var scope = $rootScope.$new(true)
      scope.action = action
      $ionicModal.fromTemplateUrl('views/modals/password.html', {
        scope: scope,
        animation: 'none',
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        scope.passwordModal = modal
        root.openModalType = 'password'
        scope.openModal()
      })
      scope.openModal = function () {
        scope.passwordModal.show()
      }
      root.hideModal = scope.hideModal = function () {
        scope.$emit('passwordModalClosed')
        root.openModalType = null
        scope.passwordModal.hide()
        root.startWaitingForSoft()
      }
    }

    root.pinModal = function (action) {
      var scope = $rootScope.$new(true)
      scope.action = action
      $ionicModal.fromTemplateUrl('views/modals/pin.html', {
        scope: scope,
        animation: 'none',
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        scope.pinModal = modal
        root.openModalType = 'pin'
        scope.openModal()
      })
      scope.openModal = function () {
        scope.pinModal.show()
      }
      root.hideModal = scope.hideModal = function () {
        scope.$emit('pinModalClosed')
        root.openModalType = null
        scope.pinModal.hide()
        root.startWaitingForSoft()
      }
    }

    // When app goes into background
    root.lockBackground = function (force) {
      root.backgroundTimestamp = new Date()
      root.lock(root.lockTypeBackground, force)
    }

    // When soft timeout is reached, we lock soft if not already locked
    root.lockSoft = function (force) {
      if (!root.openModalType) {
        $log.debug('Locking soft: ' + new Date())
        root.lock(root.lockTypeSoft, force)
      } else {
        $log.debug('Already locked, not locking soft')
      }
    }

    // When hard timeout is reached, we lock hard
    root.lockHard = function (force) {
      $log.debug('Locking hard: ' + new Date())
      root.lock('password', force)
    }
    
    // When starting BCB wallet etc
    root.lockStartup = function () {
      root.lock('password', true, true)
    }

    root.lockPassword = function () {
      root.lock('password', true)
    }

    // Called on resume, need to check time passed in background
    root.verifyLock = function () {
      var timePassed = (new Date() - root.backgroundTimestamp) / 1000
      $log.debug('Time passed in background: ' + timePassed)
      if (timePassed > root.timeoutHard) {
        // Force to hard lock
        root.lockHard(true)
      } else if (timePassed > root.timeoutSoft) {
        // Try soft lock
        root.lockSoft()
      }
    }

    root.lock = function (type, force, startup) {
      if (!startup && profileService.getWallet() === null) {
        $log.debug('No wallet, not locking')
        root.startWaitingForSoft()
        return
      }
      if ($state.is('tabs.preferencesSecurity.changeLocks')) {
        $log.debug('In lock settings, not locking')
        root.startWaitingForSoft()
        return
      }
      if (root.openModalType === type) return // Already locked by that type
      if (root.openModalType) {
        if (force) {
          $log.debug('Force hide current lock')
          root.hideModal()
        } else {
          $log.debug('Already locked, not locking')
          return // Already locked by other type
        }
      }
      $log.debug('Applying lock: ' + type)
      if (type === 'none') return
      if (type === 'fingerprint') {
        if (fingerprintService.isAvailable()) {
          root.fingerprintModal()
        } else {
          // Hmmm, fallback. We should not end up here normally, and PIN may not have been configured.
          // TODO: popup?
          root.passwordModal('check')
        }
      } 
      if (type === 'password') root.passwordModal('check')
      // TODO: Verify PIN has been configured?
      if (type === 'pin') root.pinModal('check')
    }

    return root
  })

'use strict'
/* global angular */
angular.module('canoeApp.services')
  .factory('backupService', function backupServiceFactory ($log, $timeout, profileService) {
    var root = {}

    var _download = function (ew, filename, cb) {
      var NewBlob = function (data, datatype) {
        var out

        try {
          out = new Blob([data], {
            type: datatype
          })
          $log.debug('case 1')
        } catch (e) {
          window.BlobBuilder = window.BlobBuilder ||
            window.WebKitBlobBuilder ||
            window.MozBlobBuilder ||
            window.MSBlobBuilder

          if (e.name === 'TypeError' && window.BlobBuilder) {
            var bb = new BlobBuilder()
            bb.append(data)
            out = bb.getBlob(datatype)
            $log.debug('case 2')
          } else if (e.name === 'InvalidStateError') {
            // InvalidStateError (tested on FF13 WinXP)
            out = new Blob([data], {
              type: datatype
            })
            $log.debug('case 3')
          } else {
            // We're screwed, blob constructor unsupported entirely
            $log.debug('Error')
          }
        }
        return out
      };

      var a = angular.element('<a></a>')
      var blob = new NewBlob(ew, 'text/plain;charset=utf-8')
      a.attr('href', window.URL.createObjectURL(blob))
      a.attr('download', filename)
      a[0].click()
      return cb()
    }

    root.walletExport = function (password, opts) {
      if (!password) {
        return null
      }
      try {
        var ewallet = profileService.getExportWallet()
        opts = opts || {}
        if (opts.addressBook) {
          ewallet.addressBook = opts.addressBook
        }
        return JSON.stringify(ewallet)
      } catch (err) {
        $log.debug('Error exporting wallet: ', err)
        return null
      }
    }

    root.walletDownload = function (password, opts, cb) {
      var ew = root.walletExport(password, opts)
      if (!ew) return cb('Could not create backup')
      var filename = 'bcb-exported-wallet.json'
      _download(ew, filename, cb)
    }
    return root
  })

'use strict'

angular.module('canoeApp.services').factory('buyAndSellService', function ($log, lodash, $ionicScrollDelegate, $timeout) {
  var root = {}
  var services = []
  var linkedServices = []

  root.update = function () {
    var newLinked = lodash.filter(services, function (x) {
      return x.linked
    })

    // This is to preserve linkedServices pointer
    while (linkedServices.length)
      {linkedServices.pop();}

    while (newLinked.length)
      {linkedServices.push(newLinked.pop());}
    //

    $log.debug('buyAndSell Service, updating nextSteps. linked/total: ' + linkedServices.length + '/' + services.length)

    /*if (linkedServices.length == 0) {
      nextStepsService.register({
        title: 'Buy or Sell Bitcoin',
        name: 'buyandsell',
        icon: 'icon-buy-bitcoin',
        sref: 'tabs.buyandsell'
      })
    } else {
      nextStepsService.unregister({
        name: 'buyandsell'
      })
    };*/

    $timeout(function () {
      $ionicScrollDelegate.resize()
    }, 10)
  };

  var updateNextStepsDebunced = lodash.debounce(root.update, 1000)

  root.register = function (serviceInfo) {
    services.push(serviceInfo)
    $log.info('Adding Buy and Sell service:' + serviceInfo.name + ' linked:' + serviceInfo.linked)
    updateNextStepsDebunced()
  };

  root.updateLink = function (name, linked) {
    var service = lodash.find(services, function (x) {
      return x.name == name
    })
    $log.info('Updating Buy and Sell service:' + name + ' linked:' + linked)
    service.linked = linked

    root.update()
  };

  root.get = function () {
    return services
  };

  root.getLinked = function () {
    return linkedServices
  };

  return root
})

'use strict'
/* global angular */
angular.module('canoeApp.services').factory('configService', function ($http, storageService, lodash, $log, $timeout, $rootScope, platformInfo) {
  var root = {}
  root.http = $http

  var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

  var defaultConfig = {
    download: {
      canoe: {
        url: 'https://betawallet.bitcoinblack.info'
      }
    },

    backend: 'betawallet.bitcoinblack.info',

    rateApp: {
      canoe: {
        ios: 'https://itunes.apple.com/us/app/canoe-nano-wallet/id1365127213?mt=8',
        android: 'https://play.google.com/store/apps/details?id=io.getcanoe.canoe',
        wp: ''
      }
    },
    // Wallet default config
    wallet: {
      timeoutSoft: 30,
      timeoutHard: 60,
      lockTypeSoft: 'none', // PIN is not yet configured and fingerprint may not be available
      lockTypeBackground: 'none', // PIN is not yet configured and fingerprint may not be available
      serverSidePoW: (!platformInfo.isLinux), // On NW Linux we now have good client side PoW
      playSounds: true,
      settings: {
        unitName: 'NANO',
        unitToRaw: Math.pow(10, 28),
        unitDecimals: 2,
        unitCode: 'NANO',
        alternativeName: 'US Dollar',
        alternativeIsoCode: undefined,
        amountInputDefaultCurrency: 'NANO'
      }
    },

    lock: {
      value: '0000', // If people enable PIN and haven't set it yet
      bannedUntil: null
    },

    release: {
      url: 'https://api.github.com/repos/getcanoe/canoe/releases/latest'
    },

    pushNotificationsEnabled: true,

    confirmedTxsNotifications: {
      enabled: true
    },

    emailNotifications: {
      enabled: false
    },

    log: {
      filter: 'debug'
    }
  }

  var configCache = null

  // Contry code to curency map, hacked from https://github.com/michaelrhodes/currency-code-map
  var country_code_to_currency = {
    'AF': ['AFN', 'Afghan Afghani'],
    'AX': ['EUR', 'Eurozone Euro'],
    'AL': ['ALL', 'Albanian Lek'],
    'DZ': ['DZD', 'Algerian Dinar'],
    'AS': ['USD', 'US Dollar'],
    'AD': ['EUR', 'Eurozone Euro'],
    'AO': ['AOA', 'Angolan Kwanza'],
    'AI': ['XCD', 'East Caribbean Dollar'],
    'AG': ['XCD', 'East Caribbean Dollar'],
    'AR': ['ARS', 'Argentine Peso'], //
    'AM': ['AMD', 'Armenian Dram'],
    'AW': ['AWG', 'Aruban Florin'],
    'AU': ['AUD', 'Australian Dollar'],
    'AT': ['EUR', 'Eurozone Euro'],
    'AZ': ['AZN', 'Azerbaijani Manat'],
    'BS': ['BSD', 'Bahamian Dollar'],
    'BH': ['BHD', 'Bahraini Dinar'],
    'BD': ['BDT', 'Bangladeshi Taka'],
    'BB': ['BBD', 'Barbadian Dollar'],
    'BY': ['BYR', 'BYR'], //
    'BE': ['EUR', 'Eurozone Euro'],
    'BZ': ['BZD', 'Belize Dollar'],
    'BJ': ['XOF', 'CFA Franc BCEAO'],
    'BM': ['BMD', 'Bermudan Dollar'],
    'BT': ['BTN', 'Bhutanese Ngultrum'],
    'BO': ['BOB', 'Bolivian Boliviano'],
    'BQ': ['USD', 'US Dollar'],
    'BA': ['BAM', 'Bosnia-Herzegovina Convertible Mark'],
    'BW': ['BWP', 'Botswanan Pula'], //
    'BV': ['NOK', 'Norwegian Krone'],
    'BR': ['BRL', 'Brazilian Real'],
    'IO': ['GBP', 'Pound Sterling'],
    'BN': ['BND', 'Brunei Dollar'],
    'BG': ['BGN', 'Bulgarian Lev'],
    'BF': ['XOF', 'CFA Franc BCEAO'],
    'BI': ['BIF', 'Burundian Franc'],
    'KH': ['KHR', 'Cambodian Riel'],
    'CM': ['XAF', 'CFA Franc BEAC'],
    'CA': ['CAD', 'Canadian Dollar'], //
    'CV': ['CVE', 'Cape Verdean Escudo'],
    'KY': ['KYD', 'Cayman Islands Dollar'],
    'CF': ['XAF', 'CFA Franc BEAC'],
    'TD': ['XAF', 'CFA Franc BEAC'],
    'CL': ['CLF', 'Chilean Unit of Account (UF)'],
    'CN': ['CNY', 'Chinese Yuan'],
    'CX': ['AUD', 'Australian Dollar'],
    'CC': ['AUD', 'Australian Dollar'],
    'CO': ['COP', 'Colombian Peso'], //
    'KM': ['KMF', 'Comorian Franc'],
    'CG': ['XAF', 'CFA Franc BEAC'],
    'CD': ['CDF', 'Congolese Franc'],
    'CK': ['NZD', 'New Zealand Dollar'],
    'CR': ['CRC', 'Costa Rican Colón'],
    'CI': ['XOF', 'CFA Franc BCEAO'],
    'HR': ['HRK', 'Croatian Kuna'],
    'CU': ['CUC', 'CUC'],
    'CW': ['ANG', 'Netherlands Antillean Guilder'],
    'CY': ['EUR', 'Eurozone Euro'], //
    'CZ': ['CZK', 'Czech Koruna'],
    'DK': ['DKK', 'Danish Krone'],
    'DJ': ['DJF', 'Djiboutian Franc'],
    'DM': ['XCD', 'East Caribbean Dollar'],
    'DO': ['DOP', 'Dominican Peso'],
    'EC': ['USD', 'US Dollar'],
    'EG': ['EGP', 'Egyptian Pound'],
    'SV': ['USD', 'US Dollar'],
    'GQ': ['XAF', 'CFA Franc BEAC'],
    'ER': ['ERN', 'ERN'],
    'EE': ['EUR', 'Eurozone Euro'], //
    'ET': ['ETB', 'Ethiopian Birr'],
    'FK': ['FKP', 'Falkland Islands Pound'],
    'FO': ['DKK', 'Danish Krone'],
    'FJ': ['FJD', 'Fijian Dollar'],
    'FI': ['EUR', 'Eurozone Euro'],
    'FR': ['EUR', 'Eurozone Euro'],
    'GF': ['EUR', 'Eurozone Euro'],
    'PF': ['XPF', 'CFP Franc'],
    'TF': ['EUR', 'Eurozone Euro'],
    'GA': ['XAF', 'CFA Franc BEAC'], //
    'GM': ['GMD', 'Gambian Dalasi'],
    'GE': ['GEL', 'Georgian Lari'],
    'DE': ['EUR', 'Eurozone Euro'],
    'GH': ['GHS', 'Ghanaian Cedi'],
    'GI': ['GIP', 'Gibraltar Pound'],
    'GR': ['EUR', 'Eurozone Euro'],
    'GL': ['DKK', 'Danish Krone'],
    'GD': ['XCD', 'East Caribbean Dollar'],
    'GP': ['EUR', 'Eurozone Euro'],
    'GU': ['USD', 'US Dollar'], //
    'GT': ['GTQ', 'Guatemalan Quetzal'],
    'GG': ['GBP', 'Pound Sterling'],
    'GN': ['GNF', 'Guinean Franc'],
    'GW': ['XOF', 'CFA Franc BCEAO'],
    'GY': ['GYD', 'Guyanaese Dollar'],
    'HT': ['HTG', 'Haitian Gourde'],
    'HM': ['AUD', 'Australian Dollar'],
    'VA': ['EUR', 'Eurozone Euro'],
    'HN': ['HNL', 'Honduran Lempira'],
    'HK': ['HKD', 'Hong Kong Dollar'], //
    'HU': ['HUF', 'Hungarian Forint'],
    'IS': ['ISK', 'Icelandic Króna'],
    'IN': ['INR', 'Indian Rupee'],
    'ID': ['IDR', 'Indonesian Rupiah'],
    'IR': ['IRR', 'Iranian Rial'],
    'IQ': ['IQD', 'Iraqi Dinar'],
    'IE': ['EUR', 'Eurozone Euro'],
    'IM': ['GBP', 'Pound Sterling'],
    'IL': ['ILS', 'Israeli Shekel'],
    'IT': ['EUR', 'Eurozone Euro'], //
    'JM': ['JMD', 'Jamaican Dollar'],
    'JP': ['JPY', 'Japanese Yen'],
    'JE': ['GBP', 'Pound Sterling'],
    'JO': ['JOD', 'Jordanian Dinar'],
    'KZ': ['KZT', 'Kazakhstani Tenge'],
    'KE': ['KES', 'Kenyan Shilling'],
    'KI': ['AUD', 'Australian Dollar'],
    'KP': ['KPW', 'North Korean Won'],
    'KR': ['KRW', 'South Korean Won'],
    'KW': ['KWD', 'Kuwaiti Dinar'], //
    'KG': ['KGS', 'Kyrgystani Som'],
    'LA': ['LAK', 'Laotian Kip'],
    'LV': ['LVL', 'LVL'],
    'LB': ['LBP', 'Lebanese Pound'],
    'LS': ['LSL', 'Lesotho Loti'],
    'LR': ['LRD', 'Liberian Dollar'],
    'LY': ['LYD', 'Libyan Dinar'],
    'LI': ['CHF', 'Swiss Franc'],
    'LT': ['LTL', 'LTL'],
    'LU': ['EUR', 'Eurozone Euro'],
    'MO': ['HKD', 'Hong Kong Dollar'], //
    'MK': ['MKD', 'Macedonian Denar'],
    'MG': ['MGA', 'Malagasy Ariary'],
    'MW': ['MWK', 'Malawian Kwacha'],
    'MY': ['MYR', 'Malaysian Ringgit'],
    'MV': ['MVR', 'Maldivian Rufiyaa'],
    'ML': ['XOF', 'CFA Franc BCEAO'],
    'MT': ['EUR', 'Eurozone Euro'],
    'MH': ['USD', 'US Dollar'],
    'MQ': ['EUR', 'Eurozone Euro'],
    'MR': ['MRO', 'MRO'], //
    'MU': ['MUR', 'Mauritian Rupee'],
    'YT': ['EUR', 'Eurozone Euro'],
    'MX': ['MXN', 'Mexican Peso'],
    'FM': ['USD', 'US Dollar'],
    'MD': ['MDL', 'Moldovan Leu'],
    'MC': ['EUR', 'Eurozone Euro'],
    'MN': ['MNT', 'Mongolian Tugrik'],
    'ME': ['EUR', 'Eurozone Euro'],
    'MS': ['XCD', 'East Caribbean Dollar'],
    'MA': ['MAD', 'Moroccan Dirham'], //
    'MZ': ['MZN', 'Mozambican Metical'],
    'MM': ['MMK', 'Myanma Kyat'],
    'NA': ['NAD', 'Namibian Dollar'],
    'NR': ['AUD', 'Australian Dollar'],
    'NP': ['NPR', 'Nepalese Rupee'],
    'NL': ['EUR', 'Eurozone Euro'],
    'NC': ['XPF', 'CFP Franc'],
    'NZ': ['NZD', 'New Zealand Dollar'],
    'NI': ['NIO', 'Nicaraguan Córdoba'],
    'NE': ['XOF', 'CFA Franc BCEAO'], //
    'NG': ['NGN', 'Nigerian Naira'],
    'NU': ['NZD', 'New Zealand Dollar'],
    'NF': ['AUD', 'Australian Dollar'],
    'MP': ['USD', 'US Dollar'],
    'NO': ['NOK', 'Norwegian Krone'],
    'OM': ['OMR', 'Omani Rial'],
    'PK': ['PKR', 'Pakistani Rupee'],
    'PW': ['USD', 'US Dollar'],
    'PS': ['EGP', 'Egyptian Pound'],
    'PA': ['PAB', 'Panamanian Balboa'], //
    'PG': ['PGK', 'Papua New Guinean Kina'],
    'PY': ['PYG', 'Paraguayan Guarani'],
    'PE': ['PEN', 'Peruvian Nuevo Sol'],
    'PH': ['PHP', 'Philippine Peso'],
    'PN': ['NZD', 'New Zealand Dollar'],
    'PL': ['PLN', 'Polish Zloty'],
    'PT': ['EUR', 'Eurozone Euro'],
    'PR': ['USD', 'US Dollar'],
    'QA': ['QAR', 'Qatari Rial'],
    'RE': ['EUR', 'Eurozone Euro'], //
    'RO': ['RON', 'Romanian Leu'],
    'RU': ['RUB', 'Russian Ruble'],
    'RW': ['RWF', 'Rwandan Franc'],
    'BL': ['EUR', 'Eurozone Euro'],
    'SH': ['SHP', 'Saint Helena Pound'],
    'KN': ['XCD', 'East Caribbean Dollar'],
    'LC': ['XCD', 'East Caribbean Dollar'],
    'MF': ['EUR', 'Eurozone Euro'],
    'PM': ['CAD', 'Canadian Dollar'],
    'VC': ['XCD', 'East Caribbean Dollar'], //
    'WS': ['WST', 'Samoan Tala'],
    'SM': ['EUR', 'Eurozone Euro'],
    'ST': ['STD', 'STD'],
    'SA': ['SAR', 'Saudi Riyal'],
    'SN': ['XOF', 'CFA Franc BCEAO'],
    'RS': ['RSD', 'Serbian Dinar'],
    'SC': ['SCR', 'Seychellois Rupee'],
    'SL': ['SLL', 'Sierra Leonean Leone'],
    'SG': ['BND', 'Brunei Dollar'],
    'SX': ['ANG', 'Netherlands Antillean Guilder'], //
    'SK': ['EUR', 'Eurozone Euro'],
    'SI': ['EUR', 'Eurozone Euro'],
    'SB': ['SBD', 'Solomon Islands Dollar'],
    'SO': ['SOS', 'Somali Shilling'],
    'ZA': ['ZAR', 'South African Rand'],
    'GS': ['GBP', 'Pound Sterling'],
    'SS': ['SSP', 'SSP'],
    'ES': ['EUR', 'Eurozone Euro'],
    'LK': ['LKR', 'Sri Lankan Rupee'],
    'SD': ['SDG', 'Sudanese Pound'], //
    'SR': ['SRD', 'Surinamese Dollar'],
    'SJ': ['NOK', 'Norwegian Krone'],
    'SZ': ['SZL', 'Swazi Lilangeni'],
    'SE': ['SEK', 'Swedish Krona'],
    'CH': ['CHF', 'Swiss Franc'],
    'SY': ['SYP', 'Syrian Pound'],
    'TW': ['TWD', 'New Taiwan Dollar'],
    'TJ': ['TJS', 'Tajikistani Somoni'],
    'TZ': ['TZS', 'Tanzanian Shilling'],
    'TH': ['THB', 'Thai Baht'], //
    'TL': ['USD', 'US Dollar'],
    'TG': ['XOF', 'CFA Franc BCEAO'],
    'TK': ['NZD', 'New Zealand Dollar'],
    'TO': ['TOP', 'Tongan Paʻanga'],
    'TT': ['TTD', 'Trinidad and Tobago Dollar'],
    'TN': ['TND', 'Tunisian Dinar'],
    'TR': ['TRY', 'Turkish Lira'],
    'TM': ['TMT', 'Turkmenistani Manat'],
    'TC': ['USD', 'US Dollar'],
    'TV': ['AUD', 'Australian Dollar'], //
    'UG': ['UGX', 'Ugandan Shilling'],
    'UA': ['UAH', 'Ukrainian Hryvnia'],
    'AE': ['AED', 'UAE Dirham'],
    'GB': ['GBP', 'Pound Sterling'],
    'US': ['USD', 'US Dollar'],
    'UM': ['USD', 'US Dollar'],
    'UY': ['UYI', 'UYI'],
    'UZ': ['UZS', 'Uzbekistan Som'],
    'VU': ['VUV', 'Vanuatu Vatu'],
    'VE': ['VEF', 'Venezuelan Bolívar Fuerte'], //
    'VN': ['VND', 'Vietnamese Dong'],
    'VG': ['USD', 'US Dollar'],
    'VI': ['USD', 'US Dollar'],
    'WF': ['XPF', 'CFP Franc'],
    'EH': ['MAD', 'Moroccan Dirham'],
    'YE': ['YER', 'Yemeni Rial'],
    'ZM': ['ZMW', 'Zambian Kwacha'],
    'ZW': ['USD', 'US Dollar']
  }

  root.getSync = function () {
    if (!configCache) { throw new Error('configService#getSync called when cache is not initialized') }

    return configCache
  }

  root._queue = []
  root.whenAvailable = function (cb) {
    if (!configCache) {
      root._queue.push(cb)
      return
    }
    return cb(configCache)
  }

  root.get = function (cb) {
    storageService.getConfig(function (err, localConfig) {
      if (localConfig) {
        configCache = JSON.parse(localConfig)
      } else {
        configCache = lodash.clone(defaultConfig)
      }

      // Alternative currency guessing
      if (configCache.wallet) {
        var debug = true
        if (debug) $log.info('configCache.wallet.settings.alternativeIsoCode = ' + configCache.wallet.settings.alternativeIsoCode)
        // Do like when Onbording, with not alternative currency set
        // configCache.wallet.settings.alternativeIsoCode = undefined
        // console.log('Pretending there is no alternativeIsoCode in wallet = ' + configCache.wallet.settings.alternativeIsoCode)
        if (!configCache.wallet.settings.alternativeIsoCode) {
          configCache.wallet.settings.alternativeIsoCode = 'USD'
          // We don't have an alternative currency set in the wallet, so let's try to guess it
          // Let's get country code first, then currency
//          if (root.http) {
 //           root.http.get('https://freegeoip.net/json/').success(function (data, status) {
              // Test here :
              // response.country_code = 'XX'; // Any wrong or unknown currency
              // response.country_code = 'MM'; // 'MM' Myanmar
              // response.country_code = 'VE'; // Venezuela
              // response.country_code = 'KP'; // North Corea

              // response.country_code = 'FR'; // France -> EUR works fine
              // response.country_code = 'GB'; // UK is ok too
              // response.country_code = 'CA'; // Canada's fine, as always
              // response.country_code = 'BR'; // Brazil is ok too, so let's go to carnaval !
 //             if (debug) $log.info('data', data)
 //             if (debug) $log.info('data.country_code = ' + data.country_code)
 //             configCache.wallet.settings.alternativeIsoCode = country_code_to_currency[data.country_code][0]
 //             configCache.wallet.settings.alternativeName = country_code_to_currency[data.country_code][1]
 //             if (debug) $log.info('guessed currency = ' + configCache.wallet.settings.alternativeIsoCode)
            //  if (!configCache.wallet.settings.alternativeIsoCode) {
            //    configCache.wallet.settings.alternativeIsoCode = 'USD'
             // }
//              if (debug) $log.info('So finally configCache.wallet.settings.alternativeIsoCode = ' + configCache.wallet.settings.alternativeIsoCode)
  //          })
          // }
        }
      }

      configCache.bwsFor = configCache.bwsFor || {}
      configCache.colorFor = configCache.colorFor || {}
      configCache.aliasFor = configCache.aliasFor || {}
      configCache.emailFor = configCache.emailFor || {}

      $log.debug('Preferences read:', configCache)

      lodash.each(root._queue, function (x) {
        $timeout(function () {
          return x(configCache)
        }, 1)
      })
      root._queue = []

      return cb(err, configCache)
    })
  }

  root.set = function (newOpts, cb) {
    var config = lodash.cloneDeep(defaultConfig)
    storageService.getConfig(function (err, oldOpts) {
      oldOpts = oldOpts || {}

      if (lodash.isString(oldOpts)) {
        oldOpts = JSON.parse(oldOpts)
      }
      if (lodash.isString(config)) {
        config = JSON.parse(config)
      }
      if (lodash.isString(newOpts)) {
        newOpts = JSON.parse(newOpts)
      }

      lodash.merge(config, oldOpts, newOpts)
      configCache = config

      $rootScope.$emit('Local/SettingsUpdated')

      storageService.storeConfig(JSON.stringify(config), cb)
    })
  }

  root.reset = function (cb) {
    configCache = lodash.clone(defaultConfig)
    storageService.removeConfig(cb)
  }

  root.getDefaults = function () {
    return lodash.clone(defaultConfig)
  }

  return root
})

'use strict'
/* global angular */
angular.module('canoeApp.services').factory('emailService', function ($log, configService, lodash) {
  var root = {}

  root.updateEmail = function (opts) {
    opts = opts || {}
    if (!opts.email) return

    configService.set({
      emailFor: null, // Backward compatibility
      emailNotifications: {
        enabled: opts.enabled,
        email: opts.enabled ? opts.email : null
      }
    }, function (err) {
      if (err) $log.warn(err)
    })
  }

  root.getEmailIfEnabled = function (config) {
    config = config || configService.getSync()

    if (config.emailNotifications) {
      if (!config.emailNotifications.enabled) return

      if (config.emailNotifications.email) { return config.emailNotifications.email }
    }

    if (lodash.isEmpty(config.emailFor)) return

    // Backward compatibility
    var emails = lodash.values(config.emailFor)
    for (var i = 0; i < emails.length; i++) {
      if (emails[i] !== null && typeof emails[i] !== 'undefined') {
        return emails[i]
      }
    }
  }

  root.init = function () {
    configService.whenAvailable(function (config) {
      if (config.emailNotifications && config.emailNotifications.enabled) {
        // If email already set
        if (config.emailNotifications.email) return

        var currentEmail = root.getEmailIfEnabled(config)

        root.updateEmail({
          enabled: !!currentEmail,
          email: currentEmail
        })
      }
    })
  }

  return root
})

'use strict'
/* global angular */
angular.module('canoeApp.services').service('externalLinkService', function (platformInfo, nodeWebkitService, popupService, gettextCatalog, $window, $log, $timeout) {
  var _restoreHandleOpenURL = function (old) {
    $timeout(function () {
      $window.handleOpenURL = old
    }, 500)
  }

  this.open = function (url, optIn, title, message, okText, cancelText, cb) {
    var old = $window.handleOpenURL

    $window.handleOpenURL = function (url) {
      // Ignore external URLs
      $log.debug('Skip: ' + url)
    }

    if (platformInfo.isNW) {
      nodeWebkitService.openExternalLink(url)
      _restoreHandleOpenURL(old)
    } else {
      if (optIn) {
        var openBrowser = function (res) {
          if (res) window.open(url, '_system')
          if (cb) return cb()
          _restoreHandleOpenURL(old)
        }
        popupService.showConfirm(title, message, okText, cancelText, openBrowser)
      } else {
        window.open(url, '_system')
        _restoreHandleOpenURL(old)
      }
    }
  }
})

'use strict'
angular.module('canoeApp.services').factory('feedbackService', function ($http, $log, $httpParamSerializer, configService) {
  var root = {}
  var URL = 'http://bitcoin.black/feedback.php'

  root.send = function (dataSrc, cb) {
    $log.debug('DATA: ' + JSON.stringify(dataSrc))
    $http(_post(dataSrc)).then(function () {
      $log.info('SUCCESS: Feedback sent')
      return cb()
    }, function (err) {
      $log.info('ERROR: Feedback sent anyway.')
      return cb(err)
    })
  }

  var _post = function (dataSrc) {
    return {
      method: 'POST',
      url: URL,
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      data: $httpParamSerializer(dataSrc)
    }
  }

  root.isVersionUpdated = function (currentVersion, savedVersion) {
    if (!verifyTagFormat(currentVersion)) { return 'Cannot verify the format of version tag: ' + currentVersion }
    if (!verifyTagFormat(savedVersion)) { return 'Cannot verify the format of the saved version tag: ' + savedVersion }

    var current = formatTagNumber(currentVersion)
    var saved = formatTagNumber(savedVersion)
    if (saved.major > current.major || (saved.major === current.major && saved.minor > current.minor)) { return false }

    return true

    function verifyTagFormat (tag) {
      var regex = /^v?\d+\.\d+\.\d+$/i
      return regex.exec(tag)
    }

    function formatTagNumber (tag) {
      var formattedNumber = tag.replace(/^v/i, '').split('.')
      return {
        major: +formattedNumber[0],
        minor: +formattedNumber[1],
        patch: +formattedNumber[2]
      }
    }
  }

  return root
})

'use strict'
/* global angular FileReader LocalFileSystem cordova */
angular.module('canoeApp.services')
  .factory('fileStorageService', function (lodash, $log) {
    var root = {}, _fs, _dir

    root.init = function (cb) {
      if (_dir) return cb(null, _fs, _dir)

      function onFileSystemSuccess (fileSystem) {
        console.log('File system started: ', fileSystem.name, fileSystem.root.name)
        _fs = fileSystem
        root.getDir(function (err, newDir) {
          if (err || !newDir.nativeURL) return cb(err)
          _dir = newDir
          $log.debug('Got main dir:', _dir.nativeURL)
          return cb(null, _fs, _dir)
        })
      }

      function fail (evt) {
        var msg = 'Could not init file system: ' + evt.target.error.code
        console.log(msg)
        return cb(msg)
      };

      window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFileSystemSuccess, fail)
    }

    root.get = function (k, cb) {
      root.init(function (err, fs, dir) {
        if (err) return cb(err)
        dir.getFile(k, {
          create: false
        }, function (fileEntry) {
          if (!fileEntry) return cb()
          fileEntry.file(function (file) {
            var reader = new FileReader()

            reader.onloadend = function (e) {
              return cb(null, this.result)
            }

            reader.readAsText(file)
          })
        }, function (err) {
          // Not found
          if (err.code === 1) return cb()
          else return cb(err)
        })
      })
    }

    var writelock = {}

    root.set = function (k, v, cb, delay) {
      delay = delay || 100

      if (writelock[k]) {
        return setTimeout(function () {
          console.log('## Writelock for:' + k + ' Retrying in ' + delay)
          return root.set(k, v, cb, delay + 100)
        }, delay)
      }

      writelock[k] = true
      root.init(function (err, fs, dir) {
        if (err) {
          writelock[k] = false
          return cb(err)
        }
        dir.getFile(k, {
          create: true
        }, function (fileEntry) {
          // Create a FileWriter object for our FileEntry (log.txt).
          fileEntry.createWriter(function (fileWriter) {
            fileWriter.onwriteend = function (e) {
              // console.log('Write completed:' + k);
              writelock[k] = false
              return cb()
            }

            fileWriter.onerror = function (e) {
              var err = e.error ? e.error : JSON.stringify(e)
              console.log('Write failed: ' + err)
              writelock[k] = false
              return cb('Fail to write:' + err)
            }

            if (lodash.isObject(v)) { v = JSON.stringify(v) }

            if (v && !lodash.isString(v)) {
              v = v.toString()
            }

            // $log.debug('Writing:', k, v)
            fileWriter.write(v)
          }, cb)
        })
      })
    }

    // See https://github.com/apache/cordova-plugin-file/#where-to-store-files
    root.getDir = function (cb) {
      if (!cordova.file) {
        return cb('Could not write on device storage')
      }

      var url = cordova.file.dataDirectory
      // This could be needed for windows
      // if (cordova.file === undefined) {
      //   url = 'ms-appdata:///local/';
      window.resolveLocalFileSystemURL(url, function (dir) {
        return cb(null, dir)
      }, function (err) {
        $log.warn(err)
        return cb(err || 'Could not resolve filesystem:' + url)
      })
    }

    root.remove = function (k, cb) {
      root.init(function (err, fs, dir) {
        if (err) return cb(err)
        dir.getFile(k, {
          create: false
        }, function (fileEntry) {
          // Create a FileWriter object for our FileEntry (log.txt).
          fileEntry.remove(function () {
            console.log('File removed.')
            return cb()
          }, cb)
        }, cb)
      })
    }

    /**
     * Same as setItem, but fails if an item already exists
     */
    root.create = function (name, value, callback) {
      root.get(name,
        function (err, data) {
          if (data) {
            return callback('EXISTS')
          } else {
            return root.set(name, value, callback)
          }
        })
    }

    return root
  })

'use strict'
/* global angular FingerprintAuth */
angular.module('canoeApp.services').factory('fingerprintService', function ($log, gettextCatalog, configService, platformInfo) {
  var root = {}

  var _isAvailable = false

  if (platformInfo.isCordova && !platformInfo.isWP) {
    window.plugins.touchid = window.plugins.touchid || {}
    window.plugins.touchid.isAvailable(
      function (msg) {
        _isAvailable = 'IOS'
      },
      function (msg) {
        FingerprintAuth.isAvailable(function (result) {
          if (result.isAvailable) { _isAvailable = 'ANDROID' }
        }, function () {
          _isAvailable = false
        })
      })
  };

  var requestFinger = function (cb) {
    try {
      FingerprintAuth.encrypt({
        clientId: 'BCB'
      },
        function (result) {
          if (result.withFingerprint) {
            $log.debug('Finger OK')
            return cb()
          } else if (result.withPassword) {
            $log.debug('Finger: Authenticated with backup password')
            return cb()
          }
        },
        function (msg) {
          $log.debug('Finger Failed:' + JSON.stringify(msg))
          return cb(gettextCatalog.getString('Finger Scan Failed'))
        }
      )
    } catch (e) {
      $log.warn('Finger Scan Failed:' + JSON.stringify(e))
      return cb(gettextCatalog.getString('Finger Scan Failed'))
    }
  }

  var requestTouchId = function (cb) {
    try {
      window.plugins.touchid.verifyFingerprint(
        gettextCatalog.getString('Scan your fingerprint please'),
        function (msg) {
          $log.debug('Touch ID OK')
          return cb()
        },
        function (msg) {
          $log.debug('Touch ID Failed:' + JSON.stringify(msg))
          return cb(gettextCatalog.getString('Touch ID Failed'))
        }
      )
    } catch (e) {
      $log.debug('Touch ID Failed:' + JSON.stringify(e))
      return cb(gettextCatalog.getString('Touch ID Failed'))
    }
  }

  var isNeeded = function (client) {
    if (!_isAvailable) return false
    if (client === 'unlockingApp') return true

    var config = configService.getSync()
    config.touchIdFor = config.touchIdFor || {}

    return config.touchIdFor[client.credentials.walletId]
  }

  root.isAvailable = function (client) {
    return _isAvailable
  }

  root.check = function (client, cb) {
    if (isNeeded(client)) {
      $log.debug('FingerPrint Service:', _isAvailable)
      if (_isAvailable == 'IOS') { return requestTouchId(cb) } else { return requestFinger(cb) }
    } else {
      return cb()
    }
  }

  return root
})

'use strict';
var logs = [];
angular.module('canoeApp.services')
  .factory('historicLog', function historicLog(lodash) {
    var root = {};

    var levels = [
      { level: 'error', weight: 0, label: 'Error'},
      { level: 'warn',  weight: 1, label: 'Warning'},
      { level: 'info',  weight: 2, label: 'Info', default: true},
      { level: 'debug', weight: 3, label: 'Debug'}
    ];

    // Create an array of level weights for performant filtering.
    var weight = {};
    for (var i = 0; i < levels.length; i++) {
      weight[levels[i].level] = levels[i].weight;
    }

    root.getLevels = function() {
      return levels;
    };

    root.getLevel = function(level) {
      return lodash.find(levels, function(l) {
        return l.level == level;
      });
    };

    root.getDefaultLevel = function() {
      return lodash.find(levels, function(l) {
        return l.default;
      });
    };

    root.add = function(level, msg) {
      msg = msg.replace('/xpriv.*/', 'xpriv[Hidden]');
      logs.push({
        timestamp: new Date().toISOString(),
        level: level,
        msg: msg,
      });
    };

    root.get = function(filterWeight) {
      var filteredLogs = logs;
      if (filterWeight != undefined) {
        filteredLogs = lodash.filter(logs, function(l) {
          return weight[l.level] <= filterWeight;
        });
      }
      return filteredLogs;
    };

    return root;
  });

 'use strict';
 angular.module('canoeApp.services').factory('homeIntegrationsService', function(lodash, configService, $log) {
   var root = {};
   var services = [];

   root.register = function(serviceInfo) {
     // Check if already exists
     if (lodash.find(services, { 'name': serviceInfo.name })) return;
     $log.info('Adding home Integrations entry:' + serviceInfo.name);
     services.push(serviceInfo);
   };

   root.unregister = function(serviceName) {
     services = lodash.filter(services, function(x) {
       return x.name != serviceName
     });
   };

   root.get = function() {
     return services;
   };

   return root;

 });

'use strict'
/* global angular */
angular.module('canoeApp.services').factory('incomingData', function ($log, $state, $timeout, $ionicHistory, $rootScope, lodash, nanoService, scannerService, appConfigService, popupService, gettextCatalog) {
  var root = {}

  root.showMenu = function (data) {
    $rootScope.$broadcast('incomingDataMenu.showMenu', data)
  }

  root.redir = function (data, fromAddress, cb) {
    $log.debug('Processing incoming data: ' + data)

    function sanitizeUri (data) {
      // Fixes when a region uses comma to separate decimals
      var regex = /[\?\&]amount=(\d+([\,\.]\d+)?)/i
      var match = regex.exec(data)
      if (!match || match.length === 0) {
        return data
      }
      var value = match[0].replace(',', '.')
      var newUri = data.replace(regex, value)
      // mobile devices, uris
      newUri.replace('://', ':')
      return newUri
    }

    function getParameterByName (name, url) {
      if (!url) return
      name = name.replace(/[\[\]]/g, '\\$&')
      var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
      var results = regex.exec(url)
      if (!results) return null
      if (!results[2]) return ''
      return decodeURIComponent(results[2].replace(/\+/g, ' '))
    }

    function goSend (addr, amount, message, alias, manta) {
      $state.go('tabs.send', {}, {
        'reload': true,
        'notify': $state.current.name !== 'tabs.send'
      })
      var toName = null
      if (typeof alias !== 'undefined' && alias !== null) {
        toName = '@' + alias
      }
      // Timeout is required to enable the "Back" button
      $timeout(function () {
        if (amount) {
          $state.transitionTo('tabs.send.confirm', {
            toAmount: amount,
            toAddress: addr,
            toName: toName,
            description: message,
            isManta: manta,
            toAlias: alias,
            fromAddress: fromAddress
          })
        } else {
          $state.transitionTo('tabs.send.amount', {
            toAddress: addr,
            fromAddress: fromAddress
          })
        }
      }, 100)
    }

    // Some smart fixes
    data = sanitizeUri(data)
    nanoService.parseQRCode(data, function (err, code) {
      // If we get error here, we can't pop up since this is incremental input etc
      // so let cb handle it if we have it
      if (err) {
        if (cb) {
          return cb(err, code)
        } else {
          $log.debug('Parse QR code error: ' + err)
          return false
        }
      }
      var protocol = code.protocol
      if (protocol === 'xrb' || protocol === 'raiblocks' || protocol === 'bcb' || protocol === 'manta') {
        // if (code.alias !== null) {
        //   if (code.params.amount) {
        //     $log.debug('Go send ' + JSON.stringify(code))
        //     goSend(code.account, code.params.amount, code.params.message, code.alias)
        //   } else {
        //     goToAmountPage(code.account, code.alias)
        //   }
        // } else {
        if (code.params.amount) {
          $log.debug('Go send ' + JSON.stringify(code))
          goSend(code.account, code.params.amount, code.params.message, null, code.params.manta)
        } else {
          goToAmountPage(code.account, null, fromAddress)
        }
        // }
        return cb(null, code)
      } else if (protocol === 'xrbkey' || protocol === 'nanokey') {
        // A private key
        // xrbkey:<encoded private key>[?][label=<label>][&][message=<message>]

      } else if (protocol === 'xrbseed' || protocol === 'nanoseed') {

        // Example QR urls, see https://github.com/clemahieu/raiblocks/wiki/URI-and-QR-Code-Standard
        // Payment:
        // bcb:bcb_<encoded address>[?][amount=<raw amount>][&][label=<label>][&][message=<message>]
        // xrb:xrb_<encoded address>[?][amount=<raw amount>][&][label=<label>][&][message=<message>]
        // Key import:
        // xrbkey:<encoded private key>[?][label=<label>][&][message=<message>]
        // nanokey:<encoded private key>[?][label=<label>][&][message=<message>]
        // Seed import:
        // xrbseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
        // nanoseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
        // We could add:
        // Contact?
        // Payment with confirmation
      } else if (protocol === 'xrbblock' || protocol === 'nanoblock') {
        // Used to scan blocks as QR codes and send them off to process
        // Currently we process it blindly without any verifications
        var result = nanoService.processBlockJSON(JSON.stringify(code.block))
        if (result) {
          popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Block was scanned and sent successfully'))
        } else {
          popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Block was scanned but failed to process: ' + JSON.stringify(result)))
        }
      } else {
        // Offer clipboard
        if ($state.includes('tabs.scan')) {
          root.showMenu({
            data: data,
            type: 'text'
          })
        }
      }
      return cb(null, code)
    })
  }

  function goToAmountPage (toAddress, toAlias, fromAddress) {
    $state.go('tabs.send', {}, {
      'reload': true,
      'notify': $state.current.name !== 'tabs.send'
    })
    var toName = null
    if (typeof toAlias !== 'undefined' && toAlias !== null) {
      toName = '@' + toAlias
    }
    $timeout(function () {
      $state.transitionTo('tabs.send.amount', {
        toAddress: toAddress,
        toName: toName,
        toAlias: toAlias,
        fromAddress: fromAddress
      })
    }, 100)
  }

  return root
})

'use strict'
angular.module('canoeApp.services')
  .factory('latestReleaseService', function latestReleaseServiceFactory ($log, $http, configService) {
    var root = {}

    root.checkLatestRelease = function (cb) {
      var releaseURL = configService.getDefaults().release.url

      requestLatestRelease(releaseURL, function (err, release) {
        if (err) return cb(err)
        var currentVersion = window.version
        var latestVersion = release.data.tag_name

        if (!verifyTagFormat(currentVersion)) { return cb('Cannot verify the format of version tag: ' + currentVersion) }
        if (!verifyTagFormat(latestVersion)) { return cb('Cannot verify the format of latest release tag: ' + latestVersion) }

        var current = formatTagNumber(currentVersion)
        var latest = formatTagNumber(latestVersion)

        if (latest.major < current.major || (latest.major == current.major && latest.minor <= current.minor)) { return cb(null, false) }

        $log.debug('A new version is available: ' + latestVersion)
        return cb(null, true)
      })

      function verifyTagFormat (tag) {
        var regex = /^v?\d+\.\d+\.\d+$/i
        return regex.exec(tag)
      }

      function formatTagNumber (tag) {
        var formattedNumber = tag.replace(/^v/i, '').split('.')
        return {
          major: +formattedNumber[0],
          minor: +formattedNumber[1],
          patch: +formattedNumber[2]
        }
      }
    }

    function requestLatestRelease (releaseURL, cb) {
      $log.debug('Retrieving latest relsease information...')

      var request = {
        url: releaseURL,
        method: 'GET',
        json: true
      }

      $http(request).then(function (release) {
        $log.debug('Latest release: ' + release.data.name)
        return cb(null, release)
      }, function (err) {
        return cb('Cannot get the release information: ' + err)
      })
    }

    return root
  })

'use strict'
/* global angular */
angular.module('canoeApp.services')
  .factory('localStorageService', function (platformInfo, $timeout, $log, lodash) {
    var isNW = platformInfo.isNW
    var isChromeApp = platformInfo.isChromeApp
    var root = {}
    var ls = ((typeof window.localStorage !== 'undefined') ? window.localStorage : null)

    if (isChromeApp && !isNW && !ls) {
      $log.info('Using CHROME storage')
      ls = chrome.storage.local
    }

    if (!ls) { throw new Error('localstorage not available') }

    root.get = function (k, cb) {
      if (isChromeApp || isNW) {
        chrome.storage.local.get(k,
          function (data) {
            // TODO check for errors
            return cb(null, data[k])
          })
      } else {
        return cb(null, ls.getItem(k))
      }
    }

    /**
     * Same as setItem, but fails if an item already exists
     */
    root.create = function (name, value, callback) {
      root.get(name,
        function (err, data) {
          if (data) {
            return callback('EEXISTS')
          } else {
            return root.set(name, value, callback)
          }
        })
    }

    root.set = function (k, v, cb) {
      if (lodash.isObject(v)) {
        v = JSON.stringify(v)
      }
      if (v && !lodash.isString(v)) {
        v = v.toString()
      }

      if (isChromeApp || isNW) {
        var obj = {}

        obj[k] = v

        chrome.storage.local.set(obj, cb)
      } else {
        ls.setItem(k, v)
        return cb()
      }
    }

    root.remove = function (k, cb) {
      if (isChromeApp || isNW) {
        chrome.storage.local.remove(k, cb)
      } else {
        ls.removeItem(k)
        return cb()
      }
    }

    if (isNW) {
      $log.info('Overwritting localstorage with chrome storage for NW.JS')

      var ts = ls.getItem('migrationToChromeStorage')
      var p = ls.getItem('profile')

      // Need migration?
      if (!ts && p) {
        $log.info('### MIGRATING DATA! TO CHROME STORAGE')

        var j = 0
        for (var i = 0; i < localStorage.length; i++) {
          var k = ls.key(i)
          var v = ls.getItem(k)

          $log.debug('   Key: ' + k)
          root.set(k, v, function () {
            j++
            if (j == localStorage.length) {
              $log.info('### MIGRATION DONE')
              ls.setItem('migrationToChromeStorage', Date.now())
              ls = chrome.storage.local
            }
          })
        }
      } else if (p) {
        $log.info('# Data already migrated to Chrome storage on ' + ts)
      }
    }

    return root
  })

'use strict'
/* global angular */
angular.module('canoeApp.services')
  .factory('logHeader', function($window, appConfigService, $log, platformInfo) {
    $log.info(appConfigService.nameCase + ' v' + $window.version + ' #' + $window.commitHash)
    $log.info('Client: ' + JSON.stringify(platformInfo))
    return {}
  })

'use strict'
/* global angular XMLHttpRequest pow_initiate pow_callback Paho RAI Rai ionic bigInt */
angular.module('canoeApp.services')
  .factory('nanoService', function ($log, $rootScope, $window, $state, $ionicHistory, $timeout, configService, popupService, soundService, platformInfo, storageService, gettextCatalog, aliasService, rateService, lodash) {
    var root = {}
    var mantaHash = null;
    // This config is controlled over retained MQTT
    root.sharedconfig = {
      defaultRepresentative: null,
      servermessage: null, // { title: 'Hey', body: 'Rock on', link: 'http://betawallet.bitcoinblack.info' }
      stateblocks: {
        enable: true
      }
    }

    var POW
    // Only for OSX and Linux so far
    if (platformInfo.isOSX || platformInfo.isLinux) {
      POW = require('raiblocks-pow')
    }

    // This is where communication happens. This service is mostly called from profileService.
    // We use either XMLHttpRpc calls via rai (RaiblocksJS modified) or MQTT-over-WSS.

    // Both profileService and this service holds onto it
    root.wallet = null

    // Default server
    var host = 'https://betawallet.bitcoinblack.info/rpc'
    var mqttHost = 'betawallet.bitcoinblack.info'

    var rai = null

    root.connectRPC = function (cb) {
      try {
        $log.debug('Connecting to ' + host)
        rai = new Rai(host) // connection
        rai.initialize()
        if (cb) cb()
      } catch (e) {
        rai = null
        var msg = gettextCatalog.getString('Failed connecting to backend, no network?')
        $log.warn(msg, e)
        if (cb) cb(msg)
      }
    }

    configService.get(function (err, config) {
      if (err) return $log.debug(err)
      if (config.backend) {
        host = 'https://' + config.backend + '/rpc' // TODO need to revist this setup
        mqttHost = config.backend
        root.connectRPC()
      }
    })

    // port and ip to use for MQTT-over-WSS
    var mqttPort = 443 // Nginx acts as proxy
    var mqttClient = null
    var mqttUsername = null
    root.connected = false

    // See generatePoW below
    var powWorkers = null

    // Let's call it every second
    setTimeout(generatePoW, 1000)
    // Let's call it every 5 seconds
    setTimeout(regularBroadcast, 5000)

    root.unloadWallet = function () {
      root.disconnect()
      root.wallet = null
    }

    root.getWallet = function () {
      return root.wallet
    }

    root.setHost = function (url) {
      var oldMqttHost = mqttHost
      var oldHost = host
      mqttHost = url
      host = 'https://' + url + '/rpc'
      // Force relogin etc
      root.connectNetwork(function () {
        popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Successfully connected to backend'))
        // Now we save it also in config
        configService.set({ backend: url }, function (err) {
          if (err) $log.debug(err)
        })
        $ionicHistory.removeBackView()
        $state.go('tabs.home')
      }, function () {
        // Failed connecting, revert
        mqttHost = oldMqttHost
        host = oldHost
      })
    }

    root.getHost = function () {
      return mqttHost
    }

    // Possibility to quiet the logs
    var doLog = true

    // This function calls itself every sec and scans
    // for pending blocks or precalcs in need of work.
    function generatePoW() {
      $rootScope.$emit('work', null)
      // No wallet, no dice
      if (root.wallet === null) {
        return setTimeout(generatePoW, 1000)
      }
      // Find a pending block in need of work
      var hash = root.wallet.getNextPendingBlockToWork()
      if (!hash) {
        // No hash to work on, do we have one to precalculate?
        var accAndHash = root.wallet.getNextPrecalcToWork()
        if (accAndHash) {
          if (doLog) $log.info('Working on precalc for ' + accAndHash.account)
          doWork(accAndHash.hash, function (work, difficulty) {
            // Wallet may be purged from RAM, so need to check
            if (work && root.wallet) {
              root.wallet.addWorkToPrecalc(accAndHash.account, accAndHash.hash, work)
              $rootScope.$emit('work', root.wallet.getPoW())
              root.saveWallet(root.wallet, function () { })
            }
            setTimeout(generatePoW, 1000)
          })
        } else {
          return setTimeout(generatePoW, 1000)
        }
      } else {
        if (doLog) $log.info('Working on pending block ' + hash)
        doWork(hash, function (work, difficulty) {
          // Wallet may be purged from RAM, so need to check
          if (work && root.wallet) {
            root.wallet.addWorkToPendingBlock(hash, work, difficulty)
            $rootScope.$emit('work', root.wallet.getPoW())
            root.saveWallet(root.wallet, function () { })
          }
          setTimeout(generatePoW, 1000)
        })
      }
    }

    // Perform PoW calculation using different techniques based on platform
    // and the server or client side setting.
    function doWork(hash, callback) {
      var start = Date.now()
      // Server or client side?
      if (configService.getSync().wallet.serverSidePoW) {
        // Server side
        if (doLog) $log.info('Working on server for ' + hash)
        rai.work_generate_async(hash, function (result) {
          if (result.work && result.difficulty) {
            if (doLog) $log.info('Server side PoW found for ' + hash + ': ' + result.work + ' took: ' + (Date.now() - start) + ' ms')
            callback(result.work, result.difficulty)
          } else {
            if (doLog) $log.warn('Error doing PoW: ' + result)
            callback(null)
          }
        })
      } else {
        // Client side
        if (false) { // platformInfo.isCordova) {
          // Cordova plugin for libsodium, not working yet...
          // if (window.plugins.MiniSodium) {
          //  if (doLog) $log.info('Working on client (MiniSodium) for ' + hash)
          //  window.plugins.MiniSodium.crypto_generichash(8, hash, null, function (err, result) {
          //    if (err) return $log.error('Failed to compute client side PoW: ' + err)
          //    $log.info('Client side PoW found for ' + hash + ' took: ' + (Date.now() - start) + ' ms')
          //    callback(result)
          //  })
          // }
        } else {
          // node-raiblocks-pow (native C implementation for NodeJS, works on Desktop)
          if (POW) {
            if (doLog) $log.info('Working on client (threaded node-raiblocks-pow) for ' + hash)
            POW.threaded(hash, (err, result) => {
              if (err) {
                $log.error('Failed to compute client side PoW: ' + err)
                callback(null)
              } else {
                $log.info('Client side PoW found for ' + hash + ' took: ' + (Date.now() - start) + ' ms')
                callback(result)
              }
            })
          } else {
            // pow.wasm solution (slower but works in Chrome and is js only)
            if (doLog) $log.info('Working on client (pow.wasm) for ' + hash)
            powWorkers = pow_initiate(NaN, 'raiwallet/') // NaN = let it find number of threads
            pow_callback(powWorkers, hash, function () {
              // Do nothing
            }, function (result) {
              $log.info('Client side PoW found for ' + hash + ' took: ' + (Date.now() - start) + ' ms')
              callback(result)
            })
          }
        }
      }
    }

    // Retry broadcasts every 5 seconds, does nothing if empty.
    function regularBroadcast() {
      if (root.wallet) {
        root.broadcastCallback(root.wallet.getReadyBlocks())
      }
      setTimeout(regularBroadcast, 5000)
    }

    // This is called both from inside Wallet immediately
    // when a block is ready, and using a timeout, see above.
    root.broadcastCallback = function (blocks) {
      var dirty = false
      lodash.each(blocks, function (blk) {
        var res = root.broadcastBlock(blk)
        var hash = res.hash
        if (hash) {
          $log.debug('Succeeded broadcast, removing readyblock: ' + hash)
          root.wallet.removeReadyBlock(hash)
          dirty = true
        } else {
          var h = blk.getHash(true)
          $log.debug('Failed broadcast, removing readyblock: ' + h)
          root.wallet.removeReadyBlock(h)
          // This will fix the tip of the chain to match network, no need to set dirty
          // since syncChain will save wallet
          // syncChain(root.wallet, blk.account)
        }
      })
      if (dirty) {
        root.saveWallet(root.wallet, function () { })
      }
    }

    root.connectNetwork = function (cb, cberr) {
      // Makes sure we have the right backend for RPC
      root.connectRPC(function (err) {
        if (err) {
          $timeout(function () {
            popupService.showAlert(gettextCatalog.getString('Failed connecting to backend'), err)
            $ionicHistory.removeBackView()
            $state.go('tabs.home')
          }, 1000)
          if (cberr) cberr(err)
        } else {
          // Make sure we have an account for this wallet on the server side
          root.createServerAccount(root.wallet, function (err) {
            if (err) {
              $timeout(function () {
                popupService.showAlert(gettextCatalog.getString('Failed connecting to backend'), err)
                $ionicHistory.removeBackView()
                $state.go('tabs.home')
              }, 1000)
              if (cberr) cberr(err)
            } else {
              root.disconnect() // Makes sure we are disconnected from MQTT
              root.startMQTT(cb)
            }
          })
        }
      })
    }

    // Whenever the wallet is replaced we call this
    root.setWallet = function (wallet, cb) {
      root.wallet = wallet
      wallet.setLogger($log)
      // Install callback for broadcasting of blocks
      wallet.setBroadcastCallback(root.broadcastCallback)
      cb(null, root.wallet)
      root.connectNetwork()
    }

    // Perform repair tricks, can be chosen in Advanced settings
    root.repair = function () {
      clearPrecalc()
      resetChains()
    }

    // Import all chains for the whole wallet from scratch throwing away local forks we have.
    function resetChains() {
      if (root.wallet) {
        root.wallet.enableBroadcast(false)
        var accountIds = root.wallet.getAccountIds()
        lodash.each(accountIds, function (account) {
          resetChainInternal(root.wallet, account)
        })
        // Better safe than sorry, we always remove them.
        root.wallet.clearWalletPendingBlocks()
        root.wallet.clearReadyBlocks()
        root.wallet.enableBroadcast(true) // Turn back on
        root.fetchPendingBlocks()
        root.saveWallet(root.wallet, function () { })
      }
    }

    // This function is meant to quickly, from the last block in the chain
    // make sure we are in sync. The function resetChainInternal does a full reconstruct
    // of the chain and takes a lot of time. We have the following situations:
    // 1. We are already in perfect sync, all is well.
    // 2. Our chain is good, but there are more blocks on the network. We need to process them.
    // 3. We have extra blocks not on the network, we throw them away.
    // 4. A combination of 2 and 3, a fork. We throw ours away and process those on the network.
    function syncChain(wallet, account) {
      root.wallet.enableBroadcast(false)
      // Get our full chain, this is a fast operation.
      var currentBlocks = wallet.getLastNBlocks(account, 99999)
      // Get last block from network
      var frontiers = rai.accounts_frontiers([account])
      var lastHash = frontiers[account]
      // Is our chain empty?
      if (currentBlocks.length === 0) {
        // Are they both empty?
        if (!lastHash) {
          return true
        }
        // Network has blocks that we do not, process them
      } else {
        var lastBlock = currentBlocks[currentBlocks.length - 1]
        // Are the last hashes the same
        if (lastHash && lastBlock)
          var ourLastHash = currentBlocks.pop().hash
        if (lastHash === ourLastHash) {
          return
        }
      }
      var history = rai.account_history(account)
      if (history) {
        var blocks = history.reverse()
        // Loop until:
        // a) History has a fork -> adopt fork from history
        // b) History runs out -> truncate what we have

        lodash.each(blocks, function (block) {
          var our = currentBlocks.pop()
          if (our.hash !== block.hash) {
            // Found fork
          }
        })
        // We have to make this call too so we get work, signature and timestamp
        var infos = rai.blocks_info(hashes, 'raw', false, true) // true == include source_account
        // Unfortunately blocks is an object so to get proper order we use hashes
        lodash.each(blocks, function (block) {
          var hash = block.hash
          var info = infos[hash]
          block.work = info.contents.work
          block.signature = info.contents.signature
          block.previous = info.contents.previous
          block.extras = {
            blockAccount: info.block_account,
            blockAmount: info.amount,
            timestamp: info.timestamp,
            origin: info.source_account
          }
          // For some reason account_history is different...
          if (block.type === 'open') {
            block.account = info.contents.account
          }
          if (info.contents.balance) {
            block.balance = info.contents.balance // hex for old blocks, decimal for new
          }
          // State logic
          if (block.type === 'state') {
            block.state = true
            block.account = info.contents.account
          }
          var blk = wallet.createBlockFromJSON(block)
          if (blk.getHash(true) !== hash) {
            console.log('WRONG HASH')
          }
          blk.setImmutable(true)
          try {
            // First we check if this is a fork and thus adopt it if it is
            if (!wallet.importForkedBlock(blk, account)) { // Replaces any existing block
              // No fork so we can just import it
              wallet.importBlock(blk, account)
            }
            // It was added so remove it from currentBlocks
            lodash.remove(currentBlocks, function (b) {
              return b.getHash(true) === hash
            })
            wallet.removeReadyBlock(blk.getHash(true)) // so it is not broadcasted, not necessary
          } catch (e) {
            $log.error(e)
          }
        })
      }

      wallet.enableBroadcast(true) // Turn back on
      root.fetchPendingBlocks()
      root.saveWallet(wallet, function () { })
    }

    function resetChain(wallet, account) {
      wallet.enableBroadcast(false)
      resetChainInternal(wallet, account)
      wallet.enableBroadcast(true) // Turn back on
      root.fetchPendingBlocks()
      root.saveWallet(wallet, function () { })
    }

    function resetChainInternal(wallet, account) {
      // Better safe than sorry, we always remove them.
      wallet.removePendingBlocks(account)
      // var currentBlocks = wallet.getLastNBlocks(account, 99999)
      var history = rai.account_history(account)
      if (history) {
        var blocks = history.reverse()
        var hashes = []
        lodash.each(blocks, function (block) {
          hashes.push(block.hash)
        })
        // We have to make this call too so we get work, signature and timestamp
        var infos = rai.blocks_info(hashes, 'raw', false, true) // true == include source_account
        // Unfortunately infos is an object so to get proper order we use hashes
        lodash.each(blocks, function (block) {
          var hash = block.hash
          var info = infos[hash]
          block.work = info.contents.work
          block.signature = info.contents.signature
          block.previous = info.contents.previous
          block.extras = {
            blockAccount: info.block_account,
            blockAmount: info.amount,
            timestamp: info.timestamp,
            origin: info.source_account
          }
          // For some reason account_history is different...
          if (block.type === 'open') {
            block.account = info.contents.account
          }
          if (info.contents.balance) {
            block.balance = info.contents.balance // hex for old blocks, decimal for new
          }
          // State logic
          if (block.type === 'state') {
            block.state = true
            block.account = info.contents.account
          }
          var blk = wallet.createBlockFromJSON(block)
          if (blk.getHash(true) !== hash) {
            console.log('WRONG HASH')
          }
          blk.setImmutable(true)
          try {
            // First we check if this is a fork and thus adopt it if it is
            if (!wallet.importForkedBlock(blk, account)) { // Replaces any existing block
              // No fork so we can just import it
              wallet.importBlock(blk, account)
            }
            // It was added so remove it from currentBlocks
            // lodash.remove(currentBlocks, function (b) {
            //   return b.getHash(true) === hash
            // })
            wallet.removeReadyBlock(blk.getHash(true)) // so it is not broadcasted, not necessary
          } catch (e) {
            $log.error(e)
          }
        })
        // Now we add any old blocks and rebroadcast them
        // $log.debug('Current blocks not found from server: ' + JSON.stringify(currentBlocks))
        // wallet.enableBroadcast(true) // Turn back on
        // lodash.each(currentBlocks, function (b) {
        //   wallet.addBlockToReadyBlocks(b)
        // })
        // wallet.enableBroadcast(false) // Turn off
      } else {
        // Empty it from blocks
        wallet.resetChain(account)
      }
    }

    function clearPrecalc() {
      root.wallet.clearPrecalc()
      root.saveWallet(root.wallet, function () { })
    }

    window.fetchPendingBlocks = root.fetchPendingBlocks
    window.resetChains = resetChains
    window.root = root

    // Explicitly ask for pending blocks and fetching them to process them as if
    // they came in live over the rai_node callback
    root.fetchPendingBlocks = function () {
      if (root.wallet) {
        var accountIds = root.wallet.getAccountIds()
        var accountsAndHashes = rai.accounts_pending(accountIds)
        $log.debug('Pending hashes: ' + JSON.stringify(accountsAndHashes))
        lodash.each(accountsAndHashes, function (hashes, account) {
          if (account.startsWith('xrb')) {
            account = account.substring(3)
            account = 'nano'.concat(account)
          }
          var blocks = rai.blocks_info(hashes)
          lodash.each(blocks, function (blk, hash) {
            root.handleIncomingSendBlock(hash, account, blk.block_account, blk.amount)
          })
        })
      }
    }

    // Synchronous call that currently returns hash if it succeeded, null otherwise
    // TODO make async
    root.broadcastBlock = function (blk) {
      return root.processBlockJSON(blk.getJSONBlock())
    }

    root.processBlockJSON = function (json) {
      $log.debug('Broadcast block: ' + json)
      var res = rai.process_block(json)
      $log.debug('Result ' + JSON.stringify(res))
      return res
    }

    // Parse out major parts of QR/URL syntax. Calls callback on :
    // { protocol: 'xrb', account: 'xrb_yaddayadda', params: {label: 'label', amount: '10000'}}
    root.parseQRCode = function (data, cb) {
      // <protocol>:<encoded address>[?][amount=<raw amount>][&][label=<label>][&][message=<message>]
      var code = {}
      // var protocols = ['xrb', 'nano', 'raiblocks', 'xrbseed', 'nanoseed', 'xrbkey', 'nanokey', 'xrbblock', 'nanoblock', 'manta']
      var protocols = ['bcb', 'manta']
      try {
        var parts = data.match(/^([a-z]+):(.*)/) // Match protocol:whatever
        if (!parts) {
          // No match,  perhaps a bare account, alias, seed? TODO bare key
          if (root.isValidAccount(data)) {
            // A bare account
            code.protocol = 'nano'
            parts = data
          } else if (data.startsWith('@')) {
            // A bare alias
            code.protocol = 'nano'
            parts = data
          } else if (root.isValidSeed(data)) {
            // A bare seed
            code.protocol = 'nanoseed'
            parts = data
          } else {
            // Nope, give up
            return cb('Unknown format of QR code: ' + data)
          }
        } else {
          code.protocol = parts[1]
          parts = parts[2]
        }
        if (!protocols.includes(code.protocol)) {
          return cb('Unknown protocol: ' + code.protocol)
        }
        // Special handling for JSON protocols
        $log.debug('Protocol: ' + code.protocol)
        $log.debug('Parts: ' + parts)
        if (code.protocol === 'xrbblock' || code.protocol === 'nanoblock') {
          code.block = JSON.parse(parts)
          cb(null, code)
        } else if (code.protocol === 'manta') {
          // MantaWallet.init(data, function(response) {
          //   if (response.error) {
          //     cb("Invalid Manta QR Code")
          //   } else {
          //     code.account = response.account
          //     code.params = {
          //       amount: response.amount,
          //       message: response.message,
          //       manta: true
          //     }
          //     cb(null,code)
          //   }
          // })
        } else {
          // URL style params, time to check for params
          parts = parts.split('?')
          if (code.protocol === 'xrbseed' || code.protocol === 'nanoseed') {
            code.seed = parts[0]
          } else {
            code.account = parts[0]
          }
          var kvs = {}
          if (parts.length === 2) {
            // We also have key value pairs
            var pairs = parts[1].split('&')
            lodash.each(pairs, function (pair) {
              var kv = pair.split('=')
              kvs[kv[0]] = kv[1]
            })
          }
          code.params = kvs
          if (code.account) {
            // If the account is an alias, we need to perform a lookup
            if (!root.isValidAccount(code.account)) {
              $log.debug('Account invalid')
              return cb('Account invalid' + code.account)
            }
            cb(null, code)
            // if (code.account.startsWith('@')) {
            //   code.alias = code.account.substr(1)
            //   aliasService.lookupAlias(code.alias, function (err, ans) {
            //     if (err) return $log.debug(err)
            //     $log.debug('Answer from alias server looking up ' + code.alias + ': ' + JSON.stringify(ans))
            //     if (ans) {
            //       code.account = ans.alias.address
            //       if (!root.isValidAccount(code.account)) {
            //         $log.debug('Account invalid')
            //         return
            //       }
            //       // Perform callback now
            //       cb(null, code)
            //     }
            //   })
            // } else {
            //
            // }
          } else {
            cb(null, code)
          }
        }
      } catch (e) {
        // Some other error
        cb(e)
      }
    }

    root.fetchServerStatus = function (cb) {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', host, true)
      xhr.send(JSON.stringify({ 'action': 'canoe_server_status' }))
      xhr.onreadystatechange = processRequest
      function processRequest(e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var response = JSON.parse(xhr.responseText)
          cb(null, response)
        }
      }
    }

    root.isValidSeed = function (seedHex) {
      var isValidHash = /^[0123456789ABCDEFabcdef]+$/.test(seedHex)
      return (isValidHash && (seedHex.length === 64))
    }

    root.splitSeed = function (seedHex) {
      // 64 letters is 16 groups of 4
      var g = []
      for (var count = 0; count < 16; count++) {
        g.push(seedHex.slice(count * 4, (count * 4) + 4))
      }
      var sep = '  '
      return [g.slice(0, 4).join(sep), g.slice(4, 8).join(sep),
      g.slice(8, 12).join(sep), g.slice(12, 16).join(sep)]
    }

    root.isValidAccount = function (addr) {
      if (addr.startsWith('bcb_')) {
        return rai.account_validate(addr)
      }
      return false
    }

    // Send amountRaw (bigInt) from account to addr, using wallet.
    root.send = function (wallet, account, addr, amountRaw, message, isManta) {
      $log.debug('Sending ' + amountRaw + ' from ' + account.name + ' to ' + addr)
      try {
        var blk = wallet.addPendingSendBlock(account.id, addr, amountRaw, message)
        $log.debug('Added send block successfully: ' + blk.getHash(true))
        if (isManta) {
          mantaHash = blk.getHash(true)
        }
      } catch (e) {
        $log.error('Send failed ' + e.message)
        return false
      }
      return true
    }

    root.getRepresentativeFor = function (addr) {
      return root.wallet.getRepresentative(addr)
    }

    // Change representative
    root.changeRepresentative = function (addr, rep) {
      try {
        $log.debug('Changing representative for ' + addr + ' to ' + rep)
        var blk = root.wallet.addPendingChangeBlock(addr, rep)
        $log.debug('Added change block successfully: ' + blk.getHash(true))
      } catch (e) {
        $log.error('Change representative failed ' + e.message)
        return false
      }
      return true
    }

    // Create a new wallet
    root.createNewWallet = function (password) {
      var wallet = RAI.createNewWallet(password)
      if (root.sharedconfig.stateblocks.enable) {
        wallet.enableStateBlocks(true)
      }
      return wallet
    }

    // Create a corresponding account in the server for this wallet
    root.createServerAccount = function (wallet, cb) {
      $log.debug('Creating server account for wallet ' + wallet.getId())
      var meta = {
        platform: ionic.Platform.platform(),
        platformVersion: ionic.Platform.version()
      }
      var json = rai.create_server_account(wallet.getId(), wallet.getToken(), wallet.getTokenPass(), 'canoe', $window.version, meta)
      if (json.error) {
        $log.debug('Error creating server account: ' + json.error + ' ' + json.message)
        cb(json.message)
      } else {
        cb(null)
      }
    }

    // Subscribe to our private topics for incoming messages
    root.subscribeForWallet = function (wallet) {
      // Subscribe to rate service
      root.subscribe('rates')
      // Subscribe to sharedconfig
      root.subscribe('sharedconfig/#')
      // Subscribe to blocks sent to our own wallet id
      root.subscribe('wallet/' + wallet.getId() + '/block/#')
    }

    // Create a new wallet given a good password created by the user, and optional seed.
    root.createWallet = function (password, seed, cb) {
      $log.debug('Creating new wallet')
      var wallet = root.createNewWallet(password)
      if (root.sharedconfig.defaultRepresentative) {
        root.wallet.setDefaultRepresentative(root.sharedconfig.defaultRepresentative)
      }
      wallet.createSeed(seed ? seed.toUpperCase() : null)
      // Recreate existing accounts
      wallet.enableBroadcast(false)
      var emptyAccounts = 0
      var accountNum = 1
      do {
        var accountName = gettextCatalog.getString('Account') + ' ' + accountNum
        accountNum++
        var account = wallet.createAccount({ label: accountName })
        // We load existing blocks
        resetChainInternal(wallet, account.id)
        if (wallet.getAccountBlockCount(account.id) === 0) {
          emptyAccounts++
        } else {
          emptyAccounts = 0
        }
      } while (emptyAccounts < 20)
      // Remove last 20 accounts because they are empty
      while (emptyAccounts > 0) {
        wallet.removeLastAccount()
        emptyAccounts--
      }
      wallet.enableBroadcast(true)
      root.setWallet(wallet, cb)
      root.saveWallet(root.wallet, function () { })
      // aliasService.lookupAddress(account.id, function (err, ans) {
      //   if (err) {
      //     $log.debug(err)
      //   } else {
      //     $log.debug('Answer from alias server looking up ' + account.id + ': ' + JSON.stringify(ans))
      //     if (ans && ans.aliases.length > 0) {
      //       account.meta.alias = ans.aliases[0]
      //       wallet.setMeta(account, account.meta)
      //     }
      //     root.setWallet(wallet, cb)
      //   }
      // })
    }

    // Loads wallet from local storage using given password
    root.createWalletFromStorage = function (password, cb) {
      $log.debug('Load wallet from local storage')
      storageService.loadWallet(function (err, data) {
        if (err) {
          return cb(err)
        }
        if (!data) {
          return cb('No wallet in local storage')
        }
        root.createWalletFromData(data, password, cb)
      })
    }

    // Start MQTT
    root.startMQTT = function (cb) {
      var doneIt = false
      root.connectMQTT(root.wallet, function (connected) {
        if (connected) {
          root.updateServerMap(root.wallet)
          root.subscribeForWallet(root.wallet)
          // Failsafe for reconnects causing this to run many times
          if (!doneIt) {
            doneIt = true
            if (cb) cb()
          }
        }
      })
    }

    // Loads wallet from data using password
    root.createWalletFromData = function (data, password, cb) {
      $log.debug('Create wallet from data')
      var wallet = root.createNewWallet(password)
      root.loadWalletData(wallet, data, function (err, wallet) {
        if (err) return cb(err)
        root.setWallet(wallet, cb)
      })
    }

    // Create a new account in the wallet
    root.createAccount = function (wallet, accountName) {
      $log.debug('Creating account named ' + accountName)
      var account = wallet.createAccount({ label: accountName })
      resetChain(wallet, account.id) // It may be an already existing account so we want existing blocks
      $log.debug('Created account ' + account.id)
      root.updateServerMap(wallet)
      return account
    }

    // Remove an account from the wallet. TODO Do we actually? Or just hide?
    root.removeAccount = function (wallet, account) {
      $log.debug('Remove account in wallet named ' + account.name)
      wallet.removeAccount(account.id)
      $log.debug('Removed account: ' + account.id)
      root.updateServerMap(wallet)
    }

    // Tell server which accounts this wallet has. The server has a map of wallet id -> accounts
    // This needs to be called when a new account is created or one is removed.
    // We also call it whenever we load a wallet from data.
    // Canoe up to 0.3.5 sends only wallet id.
    // Canoe from 0.3.6 sends more information in a JSON object.
    root.updateServerMap = function (wallet) {
      var ids = wallet.getAccountIds()
      var register = {
        accounts: ids,
        wallet: wallet.getId(),
        name: 'canoe', // Other wallets can also use our backend
        version: $window.version
      }
      root.publish('wallet/' + wallet.getId() + '/register', JSON.stringify(register), 2, false)
    }

    // Encrypt and store the wallet in localstorage.
    // This should be called on every modification to the wallet.
    root.saveWallet = function (wallet, cb) {
      $rootScope.$emit('blocks', null)
      storageService.storeWallet(wallet.pack(), function () {
        if (doLog) $log.info('Wallet saved')
        cb(null, wallet)
      })
    }

    // Loads wallet from local storage using current password in wallet
    root.reloadWallet = function (wallet, cb) {
      $log.debug('Reload wallet from local storage')
      storageService.loadWallet(function (data) {
        root.loadWalletData(wallet, data, cb)
      })
    }

    // Load wallet with given data using current password in wallet
    root.loadWalletData = function (wallet, data, cb) {
      try {
        wallet.load(data)
      } catch (e) {
        $log.error('Error decrypting wallet. Check that the password is correct: ' + e)
        return cb(e)
      }
      cb(null, wallet)
    }

    /* ******************************* MQTT ********************************/

    root.publishBlock = function (block) {
      var msg = { account: block.getAccount(), block: block }
      root.publish('broadcast/' + block.getAccount(), JSON.stringify(msg), 2, false)
    }

    root.connectMQTT = function (wallet, cb) {
      mqttUsername = wallet.getToken()
      var mqttPassword = wallet.getTokenPass()
      var mqttClientId = wallet.getId()
      var opts = {
        userName: mqttUsername,
        password: mqttPassword,
        clientId: mqttClientId
      }
      // Connect to MQTT
      if (doLog) $log.info('Connecting to MQTT broker ' + mqttHost + ' port ' + mqttPort)
      // $log.debug('Options: ' + JSON.stringify(opts))
      root.connect(opts, function () {
        if (doLog) $log.info('Connected to MQTT broker.')
        if (cb) {
          cb(true)
        }
      }, function (c, code, msg) {
        $log.error('Failed connecting to MQTT: ', { context: c, code: code, msg: msg })
        root.disconnect()
        if (cb) {
          cb(false)
        }
      })
    }

    // Are we connected to the MQTT server?
    root.isConnected = function () {
      return root.connected
    }

    // Disconnects MQTT.
    root.disconnect = function () {
      if (mqttClient) {
        mqttClient.disconnect()
      }
      mqttClient = null
    }

    root.onConnectionLost = function (responseObject) {
      if (responseObject.errorCode !== 0) {
        if (doLog) $log.info('MQTT connection lost: ' + responseObject.errorMessage)
      }
      root.connected = false
    }

    root.onConnected = function (isReconnect) {
      // Fetch all pending blocks, since we have possibly missed incoming blocks
      // We can't do it right here in this handler, need a timeout
      setTimeout(function () { root.fetchPendingBlocks() }, 100)
      root.connected = true
    }

    root.onFailure = function () {
      if (doLog) $log.info('MQTT failure')
      root.connected = false
    }

    root.handleIncomingSendBlock = function (hash, account, from, amount) {
      // Create a receive (or open, if this is the first block in account)
      // block to match this incoming send block
      if (root.wallet) {
        if (root.wallet.addPendingReceiveBlock(hash, account, from, amount)) {
          if (doLog) $log.info('Added pending receive block')
          soundService.play('receive')
          root.saveWallet(root.wallet, function () { })
        }
      }
    }

    root.hasAccount = function (account) {
      return root.wallet.findKey(account) !== null
    }

    root.confirmBlock = function (blk, hash, timestamp) {
      $log.debug('Confirming block: ' + hash + ' time: ' + timestamp)
      // if (mantaHash && hash == mantaHash) {
      //   MantaWallet.publishPayment(hash)
      // }
      blk.setTimestamp(timestamp)
    }

    root.importBlock = function (block, account) {
      var wallet = root.wallet
      // State logic
      if (block.type === 'state') {
        block.state = true
      }
      var blk = wallet.createBlockFromJSON(block)
      try {
        wallet.enableBroadcast(false)
        // First we check if this is a fork and thus adopt it if it is
        if (!wallet.importForkedBlock(blk, account)) { // Replaces any existing block
          // No fork so we can just import it
          wallet.importBlock(blk, account)
        }
        wallet.removeReadyBlock(blk.getHash(true)) // so it is not broadcasted, not necessary
        wallet.enableBroadcast(true)
      } catch (e) {
        $log.error(e)
      }
    }

    root.handleIncomingBlock = function (blkType, payload) {
      /*
        {
          "account":"xrb_15d4oo67z6ruebmkcjqghawcbf5f9r4zkg8pf1af3n1s7kd9u7x3m47y8x37",
          "hash":"9818A861E6D961F0F94EA19FC1F54D714F076F258F6C2637502AD9FEDA6E83B5",
          "block":"{\n    \"type\": \"send\",\n    \"previous\": \"DBDC7AA21FA059513C7390F8ADB6EAA664384126E64DB50CFE09E31F594CDCFF\",\n    \"destination\": \"xrb_117ikxnfcpoz7oz56sxdw5yhwtt86rrwxsg5io6c6pbqa4fsr1cnyot4ikqu\",\n    \"balance\": \"00000000000000000000000000000000\",\n    \"work\": \"06fa80d5e00f047d\",\n    \"signature\": \"EAAC8136BD133B6A9D5584598558CE45A8A461B50414264B8AF73D04769C4F20E59A8C17C0E2B5C2A4ABD7BD3C980DE69616F93789FF5C5C613F51300A8BFF0A\"\n}\n",
          "amount":"1994000000000000000000000000000"
        }
      */
      // A block
      var blk = JSON.parse(payload)
      var blk2 = JSON.parse(blk.block)
      var hash = blk.hash
      var timestamp = blk.timestamp
      var account = blk.account
      var amount = blk.amount
      blk2.extras = {
        blockAccount: account,
        blockAmount: amount,
        timestamp: timestamp
        // origin: account ??
      }

      // Check for existing block already
      var existingBlock = null
      if (root.hasAccount(account)) {
        existingBlock = root.wallet.getBlockFromHashAndAccount(hash, account)
      }

      // Switch on block type
      switch (blkType) {
        case 'state':
          // If a send
          if (blk.is_send) {
            var to = blk2.link_as_account
            // If this is from one of our accounts we confirm or import
            if (root.hasAccount(account)) {
              soundService.play('send')
              if (existingBlock) {
                root.confirmBlock(existingBlock, hash, timestamp)
              } else {
                // or another wallet using same seed
                root.importBlock(blk2, account)
              }
            }
            // And if this is to one of our accounts, we pocket it
            if (root.hasAccount(to)) {
              // state block sends were "2^128 - amount" in the callback!
              // Fixed in V12.0 of node, so removed this:
              amount = bigInt(amount) // bigInt('340282366920938463463374607431768211456').minus(bigInt(amount))
              root.handleIncomingSendBlock(hash, to, account, amount)
            }
            return
          } else {
            // This is an echo from network
            if (existingBlock) {
              return root.confirmBlock(existingBlock, hash, timestamp)
            } else {
              // or another wallet using same seed
              return root.importBlock(blk2, account)
            }
          }
        case 'open':
          // This is an echo from network
          if (existingBlock) {
            return root.confirmBlock(existingBlock, hash, timestamp)
          } else {
            // or another wallet using same seed
            return root.importBlock(blk2, account)
          }
        case 'send':
          // If this is from one of our accounts we confirm or import
          if (root.hasAccount(account)) {
            soundService.play('send')
            if (existingBlock) {
              root.confirmBlock(existingBlock, hash, timestamp)
            } else {
              // or another wallet using same seed
              root.importBlock(blk2, account)
            }
          }
          // And if this is to one of our accounts, we pocket it
          var dest = blk2.destination
          if (root.hasAccount(dest)) {
            root.handleIncomingSendBlock(hash, dest, account, amount)
          }
          return
        case 'receive':
          // This is an echo from network
          if (existingBlock) {
            return root.confirmBlock(existingBlock, hash, timestamp)
          } else {
            // or another wallet using same seed
            return root.importBlock(blk2, account)
          }
        case 'change':
          // This is an echo from network
          soundService.play('repchanged')
          if (existingBlock) {
            return root.confirmBlock(existingBlock, hash, timestamp)
          } else {
            // or another wallet using same seed
            return root.importBlock(blk2, account)
          }
      }
      $log.error('Unknown block type: ' + blkType)
    }

    root.handleRate = function (payload) {
      var rates = JSON.parse(payload)
      rateService.updateRates(rates)
    }

    root.handleSharedConfig = function (payload) {
      var saveWallet = false
      root.sharedconfig = JSON.parse(payload)
      $log.debug('Received shared config' + JSON.stringify(root.sharedconfig))
      if (root.wallet) {
        if (root.sharedconfig.defaultRepresentative) {
          if (!root.wallet.hasDefaultRepresentative()) {
            root.wallet.setDefaultRepresentative(root.sharedconfig.defaultRepresentative)
            $log.debug('Set default representative in wallet to ' + root.sharedconfig.defaultRepresentative)
            saveWallet = true
          }
        }
        // Check if we should turn on state block generation. Can not be turned off again.
        if (root.sharedconfig.stateblocks.enable) {
          if (!root.wallet.getEnableStateBlocks()) {
            root.wallet.enableStateBlocks(true)
            $log.debug('Enabled state blocks on this wallet')
            saveWallet = true
          }
        }
        if (saveWallet) {
          root.saveWallet(root.wallet, function () {
            $log.debug('Saved changes in wallet from sharedConfig')
          })
        }
      }
      // Broadcast either null or a message
      $rootScope.$emit('servermessage', root.sharedconfig.servermessage)
    }

    root.onMessageArrived = function (message) {
      // $log.debug('Topic: ' + message.destinationName + ' Payload: ' + message.payloadString)
      var topic = message.destinationName
      var payload = message.payloadString
      // Switch over topics
      var parts = topic.split('/')
      switch (parts[0]) {
        case 'sharedconfig':
          root.handleSharedConfig(payload)
          return
        case 'wallet':
          // A wallet specific message
          // TODO ensure proper wallet id?
          if (parts[2] === 'block') {
            return root.handleIncomingBlock(parts[3], payload)
          }
          break
        case 'rates':
          return root.handleRate(payload)
      }
      $log.debug('Message not handled: ' + topic)
    }

    // Connect to MQTT. callback when connected or failed.
    root.connect = function (options, callback, callbackFailure) {
      var port = mqttPort
      var ip = mqttHost
      var userName = options.userName
      var password = options.password
      var clientId = options.clientId
      root.disconnect()
      mqttClient = new Paho.MQTT.Client(ip, port, clientId)
      mqttClient.onConnectionLost = root.onConnectionLost
      mqttClient.onConnected = root.onConnected
      mqttClient.onFailure = root.onFailure
      mqttClient.onMessageArrived = root.onMessageArrived
      var opts = {
        reconnect: true,
        keepAliveInterval: 3600,
        useSSL: true,
        userName: userName,
        password: password,
        onSuccess: callback,
        onFailure: callbackFailure
      }
      mqttClient.connect(opts)
    }

    root.publish = function (topic, json, qos, retained) {
      if (mqttClient) {
        var message = new Paho.MQTT.Message(json)
        message.destinationName = topic
        if (qos !== undefined) {
          message.qos = qos
        }
        if (retained !== undefined) {
          message.retained = retained
        }
        $log.debug('Send ' + topic + ' ' + json)
        mqttClient.send(message)
      } else {
        $log.error('Not connected to MQTT, should send ' + topic + ' ' + json)
      }
    }

    root.subscribe = function (topic) {
      mqttClient.subscribe(topic)
      $log.debug('Subscribed: ' + topic)
    }

    root.unsubscribe = function (topic) {
      mqttClient.unsubscribe(topic)
      $log.debug('Unsubscribed: ' + topic)
    }

    return root
  })
'use strict'
/* global angular */
angular.module('canoeApp.services').service('nodeWebkitService', function () {
  this.readFromClipboard = function () {
    var gui = require('nw.gui')
    var clipboard = gui.Clipboard.get()
    return clipboard.get()
  }

  this.writeToClipboard = function (text) {
    var gui = require('nw.gui')
    var clipboard = gui.Clipboard.get()
    return clipboard.set(text)
  }

  this.openExternalLink = function (url) {
    var gui = require('nw.gui')
    return gui.Shell.openExternal(url)
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.services').factory('ongoingProcess', function ($filter, lodash, $ionicLoading, gettext, platformInfo) {
  var root = {}
  var isCordova = platformInfo.isCordova
  var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

  var ongoingProcess = {}

  var processNames = {
    // 'broadcastingTx': gettext('Broadcasting transaction'),
    'creatingTx': gettext('Creating transaction'),
    'creatingAccount': gettext('Creating account...'),
    'creatingWallet': gettext('Creating Wallet...'),
    'creatingAlias': gettext('Creating Alias...'),
    'editingAlias': gettext('Editing Alias...'),
    'deletingWallet': gettext('Deleting Wallet...'),
    'extractingWalletInfo': gettext('Extracting Wallet information...'),
    // 'generatingCSV': gettext('Generating .csv file...'),
    'importingWallet': gettext('Importing Wallet...'),
    // 'recreating': gettext('Recreating Wallet...'),
    // 'rejectTx': gettext('Rejecting payment proposal'),
    // 'removeTx': gettext('Deleting payment proposal'),
    // 'retrievingInputs': gettext('Retrieving inputs information'),
    'scanning': gettext('Scanning Wallet funds...'),
    'sendingTx': gettext('Sending transaction'),
    'signingTx': gettext('Signing transaction'),
    'sweepingWallet': gettext('Sweeping Wallet...'),
    // 'validatingWords': gettext('Validating recovery phrase...'),
    'loadingTxInfo': gettext('Loading transaction info...'),
    'sendingFeedback': gettext('Sending feedback...'),
    'sendingByEmail': gettext('Preparing addresses...'),
    // 'sending2faCode': gettext('Sending 2FA code...'),
    'decryptingWallet': gettext('Decrypting wallet...')
  }

  root.clear = function () {
    ongoingProcess = {}
    if (isCordova && !isWindowsPhoneApp) {
      window.plugins.spinnerDialog.hide()
    } else {
      $ionicLoading.hide()
    }
  }

  root.get = function (processName) {
    return ongoingProcess[processName]
  }

  root.set = function (processName, isOn, customHandler) {
    root[processName] = isOn
    ongoingProcess[processName] = isOn

    var name
    root.any = lodash.any(ongoingProcess, function (isOn, processName) {
      if (isOn) { name = name || processName }
      return isOn
    })
    // The first one
    root.onGoingProcessName = name

    var showName = $filter('translate')(processNames[name] || name)

    if (customHandler) {
      customHandler(processName, showName, isOn)
    } else if (root.onGoingProcessName) {
      if (isCordova && !isWindowsPhoneApp) {
        window.plugins.spinnerDialog.show(null, showName, root.clear)
      } else {
        var tmpl
        if (isWindowsPhoneApp) tmpl = '<div>' + showName + '</div>'
        else tmpl = '<div class="item-icon-left">' + showName + '<ion-spinner class="spinner-stable" icon="lines"></ion-spinner></div>'
        $ionicLoading.show({
          template: tmpl
        })
      }
    } else {
      if (isCordova && !isWindowsPhoneApp) {
        window.plugins.spinnerDialog.hide()
      } else {
        $ionicLoading.hide()
      }
    }
  }

  return root
})

'use strict'
/* global angular chrome */
angular.module('canoeApp.services').factory('openURLService', function ($rootScope, $ionicHistory, $document, $log, $state, platformInfo, lodash, profileService, incomingData, appConfigService) {
  var root = {}

  var handleOpenURL = function (args) {
    $log.info('Handling Open URL: ' + JSON.stringify(args))
    // Stop it from caching the first view as one to return when the app opens
    $ionicHistory.nextViewOptions({
      historyRoot: true,
      disableBack: false,
      disableAnimation: true
    })

    var url = args.url
    if (!url) {
      $log.error('No url provided')
      return
    }

    if (url) {
      if ('cordova' in window) {
        window.cordova.removeDocumentEventHandler('handleopenurl')
        window.cordova.addStickyDocumentEventHandler('handleopenurl')
      }
      document.removeEventListener('handleopenurl', handleOpenURL)
    }

    document.addEventListener('handleopenurl', handleOpenURL, false)

    incomingData.redir(url, null, function (err, code) {
      if (err) {
        $log.warn('Unknown URL! : ' + url)
      }
    })
  }

  var handleResume = function () {
    $log.debug('Handle Resume @ openURL...')
    document.addEventListener('handleopenurl', handleOpenURL, false)
  }

  root.init = function () {
    $log.debug('Initializing openURL')
    document.addEventListener('handleopenurl', handleOpenURL, false)
    document.addEventListener('resume', handleResume, false)

    if (platformInfo.isChromeApp) {
      $log.debug('Registering Chrome message listener')
      chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
          if (request.url) {
            handleOpenURL(request.url)
          }
        })
    } else if (platformInfo.isNW) {
      var gui = require('nw.gui')

      // This event is sent to an existent instance of BCB wallet (only for standalone apps)
      gui.App.on('open', function (pathData) {
        // All URL protocols plus bare accounts
        if (pathData.match(/^(bcb:|bcb_)/) !== null) {
          $log.debug('BCB wallet URL found')
          handleOpenURL({
            url: pathData
          })
        }
      })

      // Used at the startup of BCB wallet
      var argv = gui.App.argv
      if (argv && argv[0]) {
        handleOpenURL({
          url: argv[0]
        })
      }
    } else if (platformInfo.isDevel) {
      var base = window.location.origin + '/'
      var url = base + '#/uri/%s'

      if (navigator.registerProtocolHandler) {
        $log.debug('Registering Browser handlers base:' + base)
        // These two not allowed, see: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler
        // navigator.registerProtocolHandler('bcb', url, 'BCB wallet BCB Handler')
        // navigator.registerProtocolHandler('xrb', url, 'BCB wallet XRB Handler')
        navigator.registerProtocolHandler('web+bcb', url, 'BCB wallet web BCB Handler')
        navigator.registerProtocolHandler('web+canoe', url, 'BCB wallet Wallet Handler')
        navigator.registerProtocolHandler('web+xrb', url, 'BCB wallet web XRB Handler')
      }
    }
  }

  root.registerHandler = function (x) {
    $log.debug('Registering URL Handler: ' + x.name)
    root.registeredUriHandlers.push(x)
  }

  root.handleURL = function (args) {
    profileService.whenAvailable(function () {
      // Wait ux to settle
      setTimeout(function () {
        handleOpenURL(args)
      }, 1000)
    })
  }

  return root
})

'use strict'
/* global angular */
angular.module('canoeApp.services').factory('platformInfo', function ($window) {
  var ua = navigator ? navigator.userAgent : null
  var isNW
  var nwOS

  if (!ua) {
    console.log('Could not determine navigator. Using fixed string')
    ua = 'dummy user-agent'
  }

  // Fixes IOS WebKit UA
  ua = ua.replace(/\(\d+\)$/, '')

  var isNodeWebkit = function () {
    var isNode = (typeof process !== 'undefined' && typeof require !== 'undefined')
    if (isNode) {
      try {
        // This is NW
        return (typeof require('nw.gui') !== 'undefined')
      } catch (e) {
        return false
      }
    }
  }

  // Detect OS of NWJs
  var isNW = !!isNodeWebkit()
  if (isNW) {
    var os = require('os')
    nwOS = os.platform()
    console.log('Detected OS: ' + nwOS)
  }
  

  // Detect mobile devices and platforms
  var ret = {
    isAndroid: ionic.Platform.isAndroid(),
    isIOS: ionic.Platform.isIOS(),
    isWP: ionic.Platform.isWindowsPhone() || ionic.Platform.platform() == 'edge',
    isSafari: Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0,
    ua: ua,
    isCordova: !!$window.cordova,
    isNW: isNW,
    isLinux: nwOS === 'linux',
    isOSX: nwOS === 'darwin',
    isWindows: (nwOS === 'win64' || nwOS === 'win32')
  }

  ret.isMobile = ret.isAndroid || ret.isIOS || ret.isWP
  ret.isChromeApp = !!($window.chrome && chrome.runtime && chrome.runtime.id && !ret.isNW)
  ret.isDevel = !ret.isMobile && !ret.isChromeApp && !ret.isNW

  //ret.supportsLedger = ret.isChromeApp
  //ret.supportsTrezor = ret.isChromeApp || ret.isDevel

  //ret.versionIntelTEE = getVersionIntelTee()
  //ret.supportsIntelTEE = ret.versionIntelTEE.length > 0

  return ret
})

'use strict'
/* global angular */
angular.module('canoeApp.services').service('popupService', function ($log, $ionicPopup, platformInfo, gettextCatalog) {
  var isCordova = platformInfo.isCordova
  var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

  /** ************* Ionic ****************/

  var _ionicAlert = function (title, message, cb, okText) {
    if (!cb) cb = function () {}
    $ionicPopup.alert({
      title: title,
      subTitle: message,
      okType: 'button-clear button-positive',
      okText: okText || gettextCatalog.getString('OK')
    }).then(cb)
  }

  var _ionicConfirm = function (title, message, okText, cancelText, cb) {
    $ionicPopup.confirm({
      title: title,
      subTitle: message,
      cancelText: cancelText,
      cancelType: 'button-clear button-positive',
      okText: okText,
      okType: 'button-clear button-positive'
    }).then(function (res) {
      return cb(res)
    })
  }

  var _ionicPrompt = function (title, message, opts, cb) {
    opts = opts || {}
    $ionicPopup.prompt({
      title: title,
      subTitle: message,
      cssClass: opts.class,
      template: '<input ng-model="data.response" type="' + opts.inputType + '" value ="" autocomplete="off" autofocus>',
      inputPlaceholder: opts.inputPlaceholder,
      defaultText: opts.defaultText
    }).then(function (res) {
      return cb(res)
    })
  }

  /** ************* Cordova ****************/

  var _cordovaAlert = function (title, message, cb, okText) {
    if (!cb) cb = function () {}
    title = title || ''
    okText = okText || gettextCatalog.getString('OK')
    navigator.notification.alert(message, cb, title, okText)
  }

  var _cordovaConfirm = function (title, message, okText, cancelText, cb) {
    var onConfirm = function (buttonIndex) {
      if (buttonIndex === 2) return cb(true)
      else return cb(false)
    }
    okText = okText || gettextCatalog.getString('OK')
    cancelText = cancelText || gettextCatalog.getString('Cancel')
    title = title || ''
    navigator.notification.confirm(message, onConfirm, title, [cancelText, okText])
  }

  var _cordovaPrompt = function (title, message, opts, cb) {
    var onPrompt = function (results) {
      if (results.buttonIndex === 1) return cb(results.input1)
      else return cb()
    }
    var okText = gettextCatalog.getString('OK')
    var cancelText = gettextCatalog.getString('Cancel')
    title = title || ''
    navigator.notification.prompt(message, onPrompt, title, [okText, cancelText], opts.defaultText)
  }

  /**
   * Show a simple alert popup
   *
   * @param {String} Title (optional)
   * @param {String} Message
   * @param {Callback} Function (optional)
   */

  this.showAlert = function (title, msg, cb, okText) {
    var message = (msg && msg.message) ? msg.message : msg
    $log.warn(title ? (title + ': ' + message) : message)

    if (isCordova) { _cordovaAlert(title, message, cb, okText) } else { _ionicAlert(title, message, cb, okText) }
  }

  /**
   * Show a simple confirm popup
   *
   * @param {String} Title (optional)
   * @param {String} Message
   * @param {String} okText (optional)
   * @param {String} cancelText (optional)
   * @param {Callback} Function
   * @returns {Callback} OK: true, Cancel: false
   */

  this.showConfirm = function (title, message, okText, cancelText, cb) {
    $log.warn(title ? (title + ': ' + message) : message)
    if (isCordova) {
      _cordovaConfirm(title, message, okText, cancelText, cb)
    } else {
      _ionicConfirm(title, message, okText, cancelText, cb)
    }
  }

  /**
   * Show a simple prompt popup
   *
   * @param {String} Title (optional)
   * @param {String} Message
   * @param {Object} Object{ inputType, inputPlaceholder, defaultText } (optional)
   * @param {Callback} Function
   * @returns {Callback} Return the value of the input if user presses OK
   */

  this.showPrompt = function (title, message, opts, cb) {
    $log.warn(title ? (title + ': ' + message) : message)

    opts = opts || {}

    if (isCordova && !isWindowsPhoneApp && !opts.forceHTMLPrompt) {
      _cordovaPrompt(title, message, opts, cb)
    } else {
      _ionicPrompt(title, message, opts, cb)
    }
  }
})

'use strict'
/* global BigNumber angular Profile */
angular.module('canoeApp.services')
  .factory('profileService', function profileServiceFactory ($rootScope, $timeout, $filter, $log, $state, lodash, storageService, nanoService, configService, gettextCatalog, uxLanguage, platformInfo, txFormatService, addressbookService, rateService) {
    // var isChromeApp = platformInfo.isChromeApp
    // var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    // var isIOS = platformInfo.isIOS

    // Avoid 15 signific digit error
    BigNumber.config({ ERRORS: false })

    // 1 BCB = 1 Mnano = 10^30 raw
    var rawPerNano = BigNumber('10000000000000000000000000000')

    // This is where we hold profile, wallet and password to decrypt it
    var root = {}
    root.profile = null
    root.password = null

    root.getWallet = function () {
      return nanoService.getWallet()
    }

    // Removed wallet from RAM
    root.unloadWallet = function () {
      nanoService.unloadWallet()
      root.enteredPassword(null)
    }

    // This is where we keep the password entered when you start BCB wallet
    // or when timeout is reached and it needs to be entered again.
    root.enteredPassword = function (pw) {
      root.password = pw
    }

    root.getEnteredPassword = function (pw) {
      return root.password
    }

    root.checkPassword = function (pw) {
      if (root.getWallet()) {
        return root.getWallet().checkPass(pw)
      }
      return false
    }

    root.changePass = function (pw, currentPw) {
      if (root.getWallet()) {
        $log.info('Changed password for wallet')
        root.getWallet().changePass(currentPw, pw)
        root.enteredPassword(pw)
        nanoService.saveWallet(root.getWallet(), function () {})
      } else {
        $log.error('No wallet to change password for')
      }
    }

    root.getSeed = function () {
      try {
        return root.getWallet().getSeed(root.password)
      } catch (e) {
        return null // Bad password or no wallet
      }
    }

    root.fetchServerStatus = function (cb) {
      nanoService.fetchServerStatus(cb)
    }

    root.toFiat = function (raw, code) {
      var rate = BigNumber(rateService.getRate(code))
      return root.formatAnyAmount(BigNumber(raw).times(rate).dividedBy(rawPerNano), uxLanguage.currentLanguage, code)
    }

    root.fromFiat = function (amount, code) {
      var rate = rateService.getRate(code)
      return (amount / rate) * rawPerNano
    }

    // Return a URI for the seed given the password
    root.getSeedURI = function (pwd) {
      // xrbseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
      return 'nanoseed:' + root.getWallet().getSeed(pwd) + '?lastindex=' + (root.getWallet().getAccountIds().length - 1)
    }

    // Return an object with wallet member holding the encrypted hex of wallet
    root.getExportWallet = function () {
      return {wallet: root.getWallet().pack()}
    }

    // Import wallet from JSON and password
    root.importWallet = function (json, password, cb) {
      var imported = JSON.parse(json)
      var walletData = imported.wallet
      // Then we try to load wallet
      nanoService.createWalletFromData(walletData, password, function (err, wallet) {
        if (err) { return cb(err) }
        // And we can also try merging addressBook
        if (imported.addressBook) {
          root.mergeAddressBook(imported.addressBook, function (err) {
            if (err) {
              $log.error(err)
            } else {
              $log.info('Merged addressbook with imported addressbook')
            }
          })
        }
        nanoService.saveWallet(wallet, function () {
          // If that succeeded we consider this entering the password
          root.enteredPassword(password)
          $log.info('Successfully imported wallet')
          cb()
        })
      })
    }

    root.formatAmount = function (raw, decimals) {
      return root.formatAnyAmount(new BigNumber(raw).dividedBy(rawPerNano), uxLanguage.currentLanguage)
    }

    root.formatAmountWithUnit = function (raw) {
      if (isNaN(raw)) return
      // TODO use current unit in settings knano, Mnano etc
      return root.formatAnyAmount(new BigNumber(raw).dividedBy(rawPerNano), uxLanguage.currentLanguage, 'BCB')
    }

    // A quite resilient and open minded way to format amounts from any epoch and location
    root.formatAnyAmount = function (amount, loc, cur) {
      var result
      var bigAmount
      var isNan = false

      try {
        bigAmount = new BigNumber(amount)
      } catch (err) {
        isNan = true
      }

      if (amount !== undefined && !isNan) {
        var decimalSeparator = '.'
        var knownLoc = true
        try {
          decimalSeparator = new BigNumber(1.1).toNumber().toLocaleString(loc)[1]
        } catch (err) {
          knownLoc = false
        }

        if (knownLoc) {
          var knownCur = true
          BigNumber.config({ EXPONENTIAL_AT: -31 })
          try {
            1.1.toLocaleString('en', {style: 'currency', currency: cur})
          } catch (err) {
            knownCur = false
          }
          if (knownCur) {
            // Known fiat currency
            result = bigAmount.toNumber().toLocaleString(loc, {style: 'currency', currency: cur})
          } else {
            // Crypto or alien currency
            var integerPart = bigAmount.round(0, BigNumber.ROUND_DOWN)
            var decimalPart = bigAmount.minus(integerPart)
            var cryptoDisplay = integerPart.toString()
            if (knownLoc) {
              cryptoDisplay = integerPart.toNumber().toLocaleString(loc)
            }
            if (!decimalPart.isZero()) {
              cryptoDisplay += decimalSeparator
              cryptoDisplay += decimalPart.toString().substr(2)
            }
            if (cur) cryptoDisplay += ' ' + cur
            result = cryptoDisplay
          }
        } else {
          result = bigAmount.toString()
          if (cur) result += ' ' + cur
        }
      }

      return result
    }

    root.formatAmountWithUnit = function (raw) {
      if (isNaN(raw)) return
      // TODO use current unit in settings knano, Mnano etc
      return root.formatAmount(raw, 2) + ' BCB'
    }

    root.updateAccountSettings = function (account) {
      configService.whenAvailable(function (config) {
        account.name = (config.aliasFor && config.aliasFor[account.id])
        account.meta.color = (config.colorFor && config.colorFor[account.id])
        account.email = config.emailFor && config.emailFor[account.id]
      })
    }

    // We set this still, but we do not really use it
    root.setBackupFlag = function () {
      storageService.setBackupFlag(function (err) {
        if (err) $log.error(err)
        $log.debug('Backup timestamp stored')
      })
    }

    // Not used, but perhaps an idea?
    root.needsBackup = function (cb) {
      storageService.getBackupFlag(function (err, val) {
        if (err) $log.error(err)
        if (val) return cb(false)
        return cb(true)
      })
    }

    root.bindProfile = function (profile, cb) {
      root.profile = profile
      configService.get(function (err) {
        $log.debug('Preferences read')
        if (err) return cb(err)
        return cb()
      })
    }

    root._queue = []
    root.whenAvailable = function (cb) {
      if (!root.isBound) {
        root._queue.push(cb)
        return
      }
      return cb()
    }

    root.loadAndBindProfile = function (cb) {
      storageService.getProfile(function (err, profile) {
        if (err) {
          $rootScope.$emit('Local/DeviceError', err)
          return cb(err)
        }
        if (!profile) {
          return cb(new Error('NOPROFILE: No profile'))
        } else if (!profile.disclaimerAccepted) {
          // Hacky: if the disclaimer wasn't accepted, assume the onboarding didn't complete
          // so just remove the profile
          storageService.deleteProfile(
            function () {
              root.loadAndBindProfile(cb)
            }
          )
        } else {
          $log.debug('Profile read')
          $log.debug('Profile: ' + JSON.stringify(profile))
          return root.bindProfile(profile, cb)
        }
      })
    }

    // Do we have funds? Presuming we are up to date here. It's a bigInt
    root.hasFunds = function () {
      return root.getWallet().getWalletBalance().greater(0)
    }

    // Create wallet and save it, seed can be null.
    root.createWallet = function (password, seed, cb) {
      // Synchronous now
      nanoService.createWallet(password, seed, function (err, wallet) {
        if (err) return cb(err)
        root.setWallet(wallet, function (err) {
          if (err) return cb(err)
          root.enteredPassword(password) // Making sure it's there
          nanoService.saveWallet(root.getWallet(), cb)
        })
      })
    }

    // Create account in wallet and save wallet
    root.createAccount = function (name, cb) {
      var accountName = name || gettextCatalog.getString('Default Account')
      nanoService.createAccount(root.getWallet(), accountName)
      nanoService.saveWallet(root.getWallet(), cb)
    }

    root.saveWallet = function (cb) {
      nanoService.saveWallet(root.getWallet(), cb)
    }

    // Load wallet from local storage using entered password
    root.loadWallet = function (cb) {
      if (!root.password) {
        return cb('No password entered, can not load wallet from local storage')
      }
      nanoService.createWalletFromStorage(root.password, function (err, wallet) {
        if (err) return cb(err)
        root.setWallet(wallet, function (err) {
          if (err) return cb(err)
          cb(null, wallet)
        })
      })
    }

    root.getId = function () {
      return root.profile.id
    }

    root.getWalletId = function () {
      return root.profile.walletId
    }

    root.getAccount = function (addr) {
      return root.getWallet().getAccount(addr)
    }

    root.getPoW = function (addr) {
      if (!root.getWallet()) {
        return null
      } else {
        return root.getWallet().getPoW(addr)
      }
    }

    root.getRepresentativeFor = function (addr) {
      return nanoService.getRepresentativeFor(addr)
    }

    root.getTxHistory = function (addr) {
      var acc = root.getAccount(addr)
      var blocks = root.getWallet().getLastNBlocks(addr, 100000)
      var txs = []
      lodash.each(blocks, function (blk) {
        var type = blk.getType()
        var tx = {type: type}
        tx.time = blk.getTimestamp() / 1000 // Seconds
        if (tx.time) {
          var isToday = new Date(tx.time * 1000).toDateString() === new Date().toDateString()
          tx.timeStr = isToday ? new Date(tx.time * 1000).toLocaleTimeString() : new Date(tx.time * 1000).toLocaleString()
        }
        tx.account = acc
        tx.amount = blk.getAmount()
        tx.amountStr = root.formatAmount(tx.amount, 2)
        tx.unitStr = 'BCB' // TODO
        tx.destination = blk.getDestination()
        tx.origin = blk.getOrigin()
        tx.representative = blk.getRepresentative() || ''
        tx.hash = blk.getHash(true)
        txs.push(tx)
      })
      return txs
    }

    root.send = function (tx, cb) {
      nanoService.send(root.getWallet(), tx.account, tx.address, tx.amount, tx.message, tx.isManta)
      cb()
    }

    // Not used yet but could be useful
    root.mergeAddressBook = function (addressBook, cb) {
      storageService.getAddressbook(function (err, localAddressBook) {
        if (err) $log.debug(err)
        var localAddressBook1 = {}
        try {
          localAddressBook1 = JSON.parse(localAddressBook)
        } catch (ex) {
          $log.warn(ex)
        }
        lodash.merge(addressBook, localAddressBook1)
        storageService.setAddressbook(JSON.stringify(addressBook), function (err) {
          if (err) return cb(err)
          return cb(null)
        })
      })
    }

    root.storeProfile = function (cb) {
      storageService.storeProfile(root.profile, function (err) {
        $log.debug('Saved Profile')
        if (cb) return cb(err)
      })
    }

    root.createProfile = function (cb) {
      $log.info('Creating profile')

      configService.get(function (err) {
        if (err) $log.debug(err)

        var p = Profile.create()
        storageService.storeNewProfile(p, function (err) {
          if (err) return cb(err)

          // Added this here, not the best place
          addressbookService.initialize(function () {
            root.bindProfile(p, function (err) {
              // ignore NONAGREEDDISCLAIMER
              if (err && err.toString().match('NONAGREEDDISCLAIMER')) return cb()
              return cb(err)
            })
          })
        })
      })
    }

    root.setDisclaimerAccepted = function (cb) {
      root.profile.disclaimerAccepted = true
      storageService.storeProfile(root.profile, function (err) {
        return cb(err)
      })
    }

    root.setWallet = function (wallet, cb) {
      root.profile.walletId = wallet.getId()
      $rootScope.$emit('walletloaded')
      storageService.storeProfile(root.profile, function (err) {
        return cb(err)
      })
    }

    root.isDisclaimerAccepted = function (cb) {
      var disclaimerAccepted = root.profile && root.profile.disclaimerAccepted
      if (disclaimerAccepted) { return cb(true) }

      // OLD flag
      storageService.getCanoeDisclaimerFlag(function (err, val) {
        if (val) {
          root.profile.disclaimerAccepted = true
          return cb(true)
        } else {
          return cb()
        }
      })
    }

    root.getAccountWithId = function (id) {
      return lodash.find(root.getAccounts(), function (a) { return a.id === id })
    }

    root.getAccountWithName = function (name) {
      return lodash.find(root.getAccounts(), function (a) { return a.name === name })
    }

    // This gets copies of all accounts in the wallet with
    // additional data attached, like formatted balances etc
    root.getAccounts = function () {
      // No wallet loaded
      if (!root.getWallet()) {
        return []
      }
      var accounts = root.getWallet().getAccounts()
      var work = root.getPoW()
      // Add formatted balances and timestamps
      lodash.each(accounts, function (acc) {
        acc.balanceStr = root.formatAmountWithUnit(parseInt(acc.balance))
        var config = configService.getSync().wallet.settings
        if (work[acc.id]) {
          acc.work = work[acc.id]
        } else {
          acc.work = null
        }
        // Don't show unless rate is loaded, ui update will be lanched by $broadcast('rates.loaded')
        acc.alternativeBalanceStr = 'hide'
        acc.alternativeBalanceStr = root.toFiat(acc.balance, config.alternativeIsoCode, 'bcb')
        acc.pendingBalanceStr = root.formatAmountWithUnit(acc.pendingBalance)
      })

      return accounts
    }

    root.toggleHideBalanceFlag = function (accountId, cb) {
      var acc = root.getAccount(accountId)
      acc.meta.balanceHidden = !acc.meta.balanceHidden
      nanoService.saveWallet(root.getWallet(), cb)
    }

    return root
  })

'use strict'
angular.module('canoeApp.services').factory('pushNotificationsService', function pushNotificationsService ($log, $state, $ionicHistory, platformInfo, lodash, appConfigService, profileService, configService) {
  var root = {}
  var isIOS = platformInfo.isIOS
  var isAndroid = platformInfo.isAndroid
  var usePushNotifications = platformInfo.isCordova && !platformInfo.isWP

  var _token = null

  root.init = function () {
    if (!usePushNotifications || _token) return
    configService.whenAvailable(function (config) {
      if (!config.pushNotificationsEnabled) return

      $log.debug('Starting push notification registration...')

      // Keep in mind the function will return null if the token has not been established yet.
      /*FCMPlugin.getToken(function (token) {
        $log.debug('Get token for push notifications: ' + token)
        _token = token
        root.enable()
      })*/
    })
  }

  root.updateSubscription = function (walletClient) {
    if (!_token) {
      $log.warn('Push notifications disabled for this device. Nothing to do here.')
      return
    }
    _subscribe(walletClient)
  }

  root.enable = function () {
    if (!_token) {
      $log.warn('No token available for this device. Cannot set push notifications. Needs registration.')
      return
    }

    var wallets = profileService.getAccounts()
    lodash.forEach(wallets, function (walletClient) {
      _subscribe(walletClient)
    })
  }

  root.disable = function () {
    if (!_token) {
      $log.warn('No token available for this device. Cannot disable push notifications.')
      return
    }

    var wallets = profileService.getAccounts()
    lodash.forEach(wallets, function (walletClient) {
      _unsubscribe(walletClient)
    })
    _token = null
  }

  root.unsubscribe = function (walletClient) {
    if (!_token) return
    _unsubscribe(walletClient)
  }

  var _subscribe = function (walletClient) {
    var opts = {
      token: _token,
      platform: isIOS ? 'ios' : isAndroid ? 'android' : null,
      packageName: appConfigService.packageNameId
    }
    walletClient.pushNotificationsSubscribe(opts, function (err) {
      if (err) $log.error(walletClient.name + ': Subscription Push Notifications error. ', JSON.stringify(err))
      else $log.debug(walletClient.name + ': Subscription Push Notifications success.')
    })
  }

  var _unsubscribe = function (walletClient, cb) {
    walletClient.pushNotificationsUnsubscribe(_token, function (err) {
      if (err) $log.error(walletClient.name + ': Unsubscription Push Notifications error. ', JSON.stringify(err))
      else $log.debug(walletClient.name + ': Unsubscription Push Notifications Success.')
    })
  }

  if (usePushNotifications) {
    /*FCMPlugin.onTokenRefresh(function (token) {
      if (!_token) return
      $log.debug('Refresh and update token for push notifications...')
      _token = token
      root.enable()
    })

    FCMPlugin.onNotification(function (data) {
      if (!_token) return
      $log.debug('New Event Push onNotification: ' + JSON.stringify(data))
      if (data.wasTapped) {
        // Notification was received on device tray and tapped by the user.
        var walletIdHashed = data.walletId
        if (!walletIdHashed) return
        $ionicHistory.nextViewOptions({
          disableAnimate: true,
          historyRoot: true
        })
        $ionicHistory.clearHistory()
        $state.go('tabs.home', {}, {
          'reload': true,
          'notify': $state.current.name != 'tabs.home'
        }).then(function () {
          _openWallet(walletIdHashed)
        })
      } else {
        // TODO
        // Notification was received in foreground. Maybe the user needs to be notified.
      }
    })*/
  }

  return root
})

'use strict'
/* global angular  */
angular.module('canoeApp.services')
  .factory('rateService', function ($rootScope, $timeout, $filter, $log, lodash, platformInfo) {
    // var isChromeApp = platformInfo.isChromeApp
    // var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    // var isIOS = platformInfo.isIOS

    var callbacks = []
    var root = {}
    root.rates = null

    root.updateRates = function (rates) {
      root.alternatives = []
      root.rates = rates
      lodash.each(rates, function (currency, code) {
        currency.isoCode = code
        root.alternatives.push({
          name: currency.name,
          isoCode: code,
          rate: currency.rate
        })
      })
      $rootScope.$broadcast('rates.loaded')
      // Run all callbacks
      lodash.each(callbacks, function (callback) {
        setTimeout(callback, 10)
      })
      callbacks = []
    }

    root.getAlternatives = function () {
      return root.alternatives
    }

    root.getRate = function (code) {
      if (!code) {
        return 0
      }
      if (root.isAvailable()) {
        var rate = root.rates[code]
        if (rate) {
          return rate.rate
        } else {
          return 0
        }
      } else {
        return 0
      }
    }

    root.isAvailable = function () {
      return root.rates !== null
    }

    root.whenAvailable = function (callback) {
      if (root.isAvailable()) {
        setTimeout(callback, 10)
      } else {
        callbacks.push(callback)
      }
    }

    root.listAlternatives = function (sort) {
      if (!root.isAvailable()) {
        return []
      }

      var alternatives = lodash.map(root.alternatives, function (item) {
        return {
          name: item.name,
          isoCode: item.isoCode
        }
      })
      if (sort) {
        alternatives.sort(function (a, b) {
          return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
        })
      }
      return lodash.uniq(alternatives, 'isoCode')
    }

    return root
  })

'use strict'
/* global cordova angular */
angular.module('canoeApp.services').service('scannerService', function ($log, $timeout, platformInfo, $rootScope, $window) {
  var isDesktop = !platformInfo.isCordova
  var QRScanner = $window.QRScanner
  var lightEnabled = false
  var backCamera = true // the plugin defaults to the back camera

  // Initalize known capabilities
  // Assume camera is available. If init fails, we'll set this to false.
  var isAvailable = true
  var hasPermission = false
  var isDenied = false
  var isRestricted = false
  var canEnableLight = false
  var canChangeCamera = false
  var canOpenSettings = false

  function _checkCapabilities (status) {
    $log.debug('scannerService is reviewing platform capabilities...')
    // Permission can be assumed on the desktop builds
    hasPermission = !!((isDesktop || status.authorized))
    isDenied = !!status.denied
    isRestricted = !!status.restricted
    canEnableLight = !!status.canEnableLight
    canChangeCamera = !!status.canChangeCamera
    canOpenSettings = !!status.canOpenSettings
    _logCapabilities()
  }

  function _logCapabilities () {
    function _orIsNot (bool) {
      return bool ? '' : 'not '
    }
    $log.debug('A camera is ' + _orIsNot(isAvailable) + 'available to this app.')
    var access = 'not authorized'
    if (hasPermission) access = 'authorized'
    if (isDenied) access = 'denied'
    if (isRestricted) access = 'restricted'
    $log.debug('Camera access is ' + access + '.')
    $log.debug('Support for opening device settings is ' + _orIsNot(canOpenSettings) + 'available on this platform.')
    $log.debug('A light is ' + _orIsNot(canEnableLight) + 'available on this platform.')
    $log.debug('A second camera is ' + _orIsNot(canChangeCamera) + 'available on this platform.')
  }

  /**
   * Immediately return known capabilities of the current platform.
   */
  this.getCapabilities = function () {
    return {
      isAvailable: isAvailable,
      hasPermission: hasPermission,
      isDenied: isDenied,
      isRestricted: isRestricted,
      canEnableLight: canEnableLight,
      canChangeCamera: canChangeCamera,
      canOpenSettings: canOpenSettings
    }
  }

  var initializeStarted = false
  /**
   * If camera access has been granted, pre-initialize the QRScanner. This method
   * can be safely called before the scanner is visible to improve perceived
   * scanner loading times.
   *
   * The `status` of QRScanner is returned to the callback.
   */
  this.gentleInitialize = function (callback) {
    if (initializeStarted && !isDesktop) {
      QRScanner.getStatus(function (status) {
        _completeInitialization(status, callback)
      })
      return
    }
    initializeStarted = true
    $log.debug('Trying to pre-initialize QRScanner.')
    if (!isDesktop) {
      QRScanner.getStatus(function (status) {
        _checkCapabilities(status)
        if (status.authorized) {
          $log.debug('Camera permission already granted.')
          initialize(callback)
        } else {
          $log.debug('QRScanner not authorized, waiting to initalize.')
          _completeInitialization(status, callback)
        }
      })
    } else {
      $log.debug('To avoid flashing the privacy light, we do not pre-initialize the camera on desktop.')
    }
  }

  function initialize (callback) {
    $log.debug('Initializing scanner...')
    QRScanner.prepare(function (err, status) {
      if (err) {
        isAvailable = false
        $log.error(err)
        // does not return `status` if there is an error
        QRScanner.getStatus(function (status) {
          _completeInitialization(status, callback)
        })
      } else {
        _completeInitialization(status, callback)
      }
    })
  }
  this.initialize = initialize

  // This could be much cleaner with a Promise API
  // (needs a polyfill for some platforms)
  var initializeCompleted = false

  function _completeInitialization (status, callback) {
    _checkCapabilities(status)
    initializeCompleted = true
    $rootScope.$emit('scannerServiceInitialized')
    if (typeof callback === 'function') {
      callback(status)
    }
  }
  this.isInitialized = function () {
    return initializeCompleted
  }
  this.initializeStarted = function () {
    return initializeStarted
  }

  var nextHide = null
  var nextDestroy = null
  var hideAfterSeconds = 5
  var destroyAfterSeconds = 60

  /**
   * (Re)activate the QRScanner, and cancel the timeouts if present.
   *
   * The `status` of QRScanner is passed to the callback when activation
   * is complete.
   */
  this.activate = function (callback) {
    $log.debug('Activating scanner...')
    QRScanner.show(function (status) {
      initializeCompleted = true
      _checkCapabilities(status)
      if (typeof callback === 'function') {
        callback(status)
      }
    })
    if (nextHide !== null) {
      $timeout.cancel(nextHide)
      nextHide = null
    }
    if (nextDestroy !== null) {
      $timeout.cancel(nextDestroy)
      nextDestroy = null
    }
  }

  /**
   * Start a new scan.
   *
   * The callback receives: (err, contents)
   */
  this.scan = function (callback) {
    $log.debug('Scanning...')
    QRScanner.scan(callback)
  }

  this.pausePreview = function () {
    QRScanner.pausePreview()
  }

  this.resumePreview = function () {
    QRScanner.resumePreview()
  }

  /**
   * Deactivate the QRScanner. To balance user-perceived performance and power
   * consumption, this kicks off a countdown which will "sleep" the scanner
   * after a certain amount of time.
   *
   * The `status` of QRScanner is passed to the callback when deactivation
   * is complete.
   */
  this.deactivate = function (callback) {
    $log.debug('Deactivating scanner...')
    QRScanner.cancelScan()
    nextHide = $timeout(_hide, hideAfterSeconds * 1000)
    nextDestroy = $timeout(_destroy, destroyAfterSeconds * 1000)
  }

  // Natively hide the QRScanner's preview
  // On mobile platforms, this can reduce GPU/power usage
  // On desktop, this fully turns off the camera (and any associated privacy lights)
  function _hide () {
    $log.debug('Scanner not in use for ' + hideAfterSeconds + ' seconds, hiding...')
    QRScanner.hide()
  }

  // Reduce QRScanner power/processing consumption by the maximum amount
  function _destroy () {
    $log.debug('Scanner not in use for ' + destroyAfterSeconds + ' seconds, destroying...')
    QRScanner.destroy()
  }

  this.reinitialize = function (callback) {
    initializeCompleted = false
    QRScanner.destroy()
    initialize(callback)
  }

  /**
   * Toggle the device light (if available).
   *
   * The callback receives a boolean which is `true` if the light is enabled.
   */
  this.toggleLight = function (callback) {
    $log.debug('Toggling light...')
    if (lightEnabled) {
      QRScanner.disableLight(_handleResponse)
    } else {
      QRScanner.enableLight(_handleResponse)
    }

    function _handleResponse (err, status) {
      if (err) {
        $log.error(err)
      } else {
        lightEnabled = status.lightEnabled
        var state = lightEnabled ? 'enabled' : 'disabled'
        $log.debug('Light ' + state + '.')
      }
      callback(lightEnabled)
    }
  }

  /**
   * Switch cameras (if a second camera is available).
   *
   * The `status` of QRScanner is passed to the callback when activation
   * is complete.
   */
  this.toggleCamera = function (callback) {
    var nextCamera = backCamera ? 1 : 0

    function cameraToString (index) {
      return index === 1 ? 'front' : 'back' // front = 1, back = 0
    }
    $log.debug('Toggling to the ' + cameraToString(nextCamera) + ' camera...')
    QRScanner.useCamera(nextCamera, function (err, status) {
      if (err) {
        $log.error(err)
      }
      backCamera = status.currentCamera !== 1
      $log.debug('Camera toggled. Now using the ' + cameraToString(backCamera) + ' camera.')
      callback(status)
    })
  }

  this.openSettings = function () {
    $log.debug('Attempting to open device settings...')
    QRScanner.openSettings()
  }

  this.useOldScanner = function (callback) {
    cordova.plugins.barcodeScanner.scan(
      function (result) {
        callback(null, result.text)
      },
      function (error) {
        callback(error)
      }
    )
  }
})

'use strict'
/* global angular Media Audio */
angular.module('canoeApp.services').factory('soundService', function ($log, platformInfo, configService) {
  var root = {}
  var isCordova = platformInfo.isCordova

  // Finding base
  var p = window.location.pathname
  var base = p.substring(0, p.lastIndexOf('/')) + '/sounds/'

  // Register sounds, use them like:
  //   soundService.play('send')
  root.sounds = {}
  root.sounds.send = makeMedia('locked.ogg')
  root.sounds.receive = makeMedia('definite.ogg')
  root.sounds.unlocking = makeMedia('confirmed.ogg')
  root.sounds.repchanged = makeMedia('filling-your-inbox.ogg')

  function makeMedia (path) {
    if (isCordova) {
      // Return media instance
      return new Media(base + path,
        // success callback
        function () {
          $log.debug('playAudio():Audio Success')
        },
        // error callback
        function (err) {
          $log.debug('playAudio():Audio Error: ' + JSON.stringify(err))
        })
    } else {
      return new Audio(base + path)
    }
  }

  root.play = function (soundName) {
    configService.get(function (err, config) {
      if (err) return $log.debug(err)
      // Fallback for existing configs
      if (typeof config.wallet.playSounds === "undefined") {
        config.wallet.playSounds = true
        var opts = {
          wallet: {
            playSounds: true
          }
        }
        configService.set(opts, function (err) {
          if (err) $log.debug(err)
        })
      }
      if (config.wallet && config.wallet.playSounds === true) {
        var sound = root.sounds[soundName]
        if (sound) {
          try {
            sound.play()
          } catch (e) {
            $log.warn('Audo play failed:' + JSON.stringify(e))
          }
        } else {
          $log.warn('Missing sound: ' + soundName)
        }
      } else {
        $log.warn('Sounds are disabled not playing: ' + soundName)
      }
    })
  }

  return root
})

'use strict'

angular.module('canoeApp.services').service('startupService', function ($log, $timeout) {
  var splashscreenVisible = true
  var statusBarVisible = false

  function _hideSplash () {
    if (typeof navigator.splashscreen !== 'undefined' && splashscreenVisible) {
      $log.debug('startupService is hiding the splashscreen...')
      $timeout(function () {
        navigator.splashscreen.hide()
      }, 20)
      splashscreenVisible = false
    }
  }
  function _showStatusBar () {
    if (typeof StatusBar !== 'undefined' && !statusBarVisible) {
      $log.debug('startupService is showing the StatusBar...')
      StatusBar.show()
      statusBarVisible = true
    }
  }
  this.ready = function () {
    _showStatusBar()
    _hideSplash()
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.services')
  .factory('storageService', function (logHeader, fileStorageService, localStorageService, $log, lodash, platformInfo, $timeout) {
    var root = {}
    var storage

    // File storage is not supported for writing according to
    // https://github.com/apache/cordova-plugin-file/#supported-platforms
    var shouldUseFileStorage = platformInfo.isCordova && !platformInfo.isWP

    if (shouldUseFileStorage) {
      $log.debug('Using: FileStorage')
      storage = fileStorageService
    } else {
      $log.debug('Using: LocalStorage')
      storage = localStorageService
    }

    var getUUID = function (cb) {
      // TO SIMULATE MOBILE
      // return cb('hola');
      if (!window || !window.plugins || !window.plugins.uniqueDeviceID) { return cb(null) }
      window.plugins.uniqueDeviceID.get(
        function (uuid) {
          return cb(uuid)
        }, cb)
    }

    // This is only used in Canoe, we used to encrypt profile using device's UUID.
    var decryptOnMobile = function (text, cb) {
      var json
      try {
        json = JSON.parse(text)
      } catch (e) {
        $log.warn('Could not open profile:' + text)

        var i = text.lastIndexOf('}{')
        if (i > 0) {
          text = text.substr(i + 1)
          $log.warn('trying last part only:' + text)
          try {
            json = JSON.parse(text)
            $log.warn('Worked... saving.')
            storage.set('profile', text, function () {})
          } catch (e) {
            $log.warn('Could not open profile (2nd try):' + e)
          }
        }
      }

      if (!json) return cb('Could not access storage')

      if (!json.iter || !json.ct) {
        $log.debug('Profile is not encrypted')
        return cb(null, text)
      }

      $log.debug('Profile is encrypted')
      getUUID(function (uuid) {
        $log.debug('Device UUID:' + uuid)
        if (!uuid) { return cb('Could not decrypt storage: could not get device ID') }

        try {
          // TODO text = sjcl.decrypt(uuid, text)

          $log.info('Migrating to unencrypted profile')
          return storage.set('profile', text, function (err) {
            return cb(err, text)
          })
        } catch (e) {
          $log.warn('Decrypt error: ', e)
          return cb('Could not decrypt storage: device ID mismatch')
        }
        return cb(null, text)
      })
    }

    root.storeNewProfile = function (profile, cb) {
      storage.create('profile', profile.toObj(), cb)
    }

    root.storeProfile = function (profile, cb) {
      storage.set('profile', profile.toObj(), cb)
    }

    root.getProfile = function (cb) {
      storage.get('profile', function (err, str) {
        if (err || !str) { return cb(err) }

        decryptOnMobile(str, function (err, str) {
          if (err) return cb(err)
          var p, err
          try {
            p = Profile.fromString(str)
          } catch (e) {
            $log.debug('Could not read profile:', e)
            err = new Error('Could not read profile:' + p)
          }
          return cb(err, p)
        })
      })
    }

    root.deleteProfile = function (cb) {
      storage.remove('profile', cb)
    }

    root.setFeedbackInfo = function (feedbackValues, cb) {
      storage.set('feedback', feedbackValues, cb)
    }

    root.getFeedbackInfo = function (cb) {
      storage.get('feedback', cb)
    }

    root.storeWallet = function (wallet, cb) {
      storage.set('raiwallet', wallet, cb)
    }

    root.loadWallet = function (cb) {
      storage.get('raiwallet', cb)
    }

    root.storeOldWallet = function (wallet, cb) {
      storage.set('wallet', wallet, cb)
    }

    root.loadOldWallet = function (cb) {
      storage.get('wallet', cb)
    }

    root.getLastAddress = function (walletId, cb) {
      storage.get('lastAddress-' + walletId, cb)
    }

    root.storeLastAddress = function (walletId, address, cb) {
      storage.set('lastAddress-' + walletId, address, cb)
    }

    root.clearLastAddress = function (walletId, cb) {
      storage.remove('lastAddress-' + walletId, cb)
    }

    root.setBackupFlag = function (cb) {
      storage.set('backup-timestamp', Date.now(), cb)
    }

    root.getBackupFlag = function (cb) {
      storage.get('backup-timestamp', cb)
    }

    root.clearBackupFlag = function (walletId, cb) {
      storage.remove('backup-' + walletId, cb)
    }

    root.setCleanAndScanAddresses = function (walletId, cb) {
      storage.set('CleanAndScanAddresses', walletId, cb)
    }

    root.getCleanAndScanAddresses = function (cb) {
      storage.get('CleanAndScanAddresses', cb)
    }

    root.removeCleanAndScanAddresses = function (cb) {
      storage.remove('CleanAndScanAddresses', cb)
    }

    root.getConfig = function (cb) {
      storage.get('config', cb)
    }

    root.storeConfig = function (val, cb) {
      $log.debug('Storing Preferences', val)
      storage.set('config', val, cb)
    }

    root.clearConfig = function (cb) {
      storage.remove('config', cb)
    }

    root.getHomeTipAccepted = function (cb) {
      storage.get('homeTip', cb)
    }

    root.setHomeTipAccepted = function (val, cb) {
      storage.set('homeTip', val, cb)
    }

    root.setHideBalanceFlag = function (walletId, val, cb) {
      storage.set('hideBalance-' + walletId, val, cb)
    }

    root.getHideBalanceFlag = function (walletId, cb) {
      storage.get('hideBalance-' + walletId, cb)
    }

    // for compatibility
    root.getCanoeDisclaimerFlag = function (cb) {
      storage.get('agreeDisclaimer', cb)
    }

    root.setRemotePrefsStoredFlag = function (cb) {
      storage.set('remotePrefStored', true, cb)
    }

    root.getRemotePrefsStoredFlag = function (cb) {
      storage.get('remotePrefStored', cb)
    }

    root.setAddressbook = function (addressbook, cb) {
      storage.set('addressbook', addressbook, cb)
    }

    root.getAddressbook = function (cb) {
      storage.get('addressbook', cb)
    }

    root.removeAddressbook = function (cb) {
      storage.remove('addressbook', cb)
    }

    root.setTransactionTimes = function (transactionTimes, cb) {
      storage.set('transactionTimes', transactionTimes, cb)
    }

    root.getTransactionTimes = function (cb) {
      storage.get('transactionTimes', cb)
    }

    root.setLastCurrencyUsed = function (lastCurrencyUsed, cb) {
      storage.set('lastCurrencyUsed', lastCurrencyUsed, cb)
    }

    root.getLastCurrencyUsed = function (cb) {
      storage.get('lastCurrencyUsed', cb)
    }

    root.setAmountInputDefaultCurrency = function (amountInputDefaultCurrency, cb) {
      storage.set('amountInputDefaultCurrency', amountInputDefaultCurrency, cb)
    }

    root.getAmountInputDefaultCurrency = function (cb) {
      storage.get('amountInputDefaultCurrency', cb)
    }

    root.checkQuota = function () {
      var block = ''
      // 50MB
      for (var i = 0; i < 1024 * 1024; ++i) {
        block += '12345678901234567890123456789012345678901234567890'
      }
      storage.set('test', block, function (err) {
        $log.error('CheckQuota Return:' + err)
      })
    }

    root.setTxHistory = function (txs, walletId, cb) {
      try {
        storage.set('txsHistory-' + walletId, txs, cb)
      } catch (e) {
        $log.error('Error saving tx History. Size:' + txs.length)
        $log.error(e)
        return cb(e)
      }
    }
    /*

    root.getTxHistory = function (walletId, cb) {
      storage.get('txsHistory-' + walletId, cb)
    }

    root.removeTxHistory = function (walletId, cb) {
      storage.remove('txsHistory-' + walletId, cb)
    }

    root.setBalanceCache = function (addr, data, cb) {
      storage.set('balanceCache-' + addr, data, cb)
    }

    root.getBalanceCache = function (addr, cb) {
      storage.get('balanceCache-' + addr, cb)
    }

    root.removeBalanceCache = function (cardId, cb) {
      storage.remove('balanceCache-' + cardId, cb)
    }
*/
    root.setAppIdentity = function (network, data, cb) {
      storage.set('appIdentity-' + network, data, cb)
    }

    root.getAppIdentity = function (network, cb) {
      storage.get('appIdentity-' + network, function (err, data) {
        if (err) return cb(err)
        cb(err, JSON.parse(data || '{}'))
      })
    }

    root.removeAppIdentity = function (network, cb) {
      storage.remove('appIdentity-' + network, cb)
    }

    root.removeAllWalletData = function (walletId, cb) {
      root.clearLastAddress(walletId, function (err) {
        if (err) return cb(err)
        root.removeTxHistory(walletId, function (err) {
          if (err) return cb(err)
          root.clearBackupFlag(walletId, function (err) {
            return cb(err)
          })
        })
      })
    }

    root.setTxConfirmNotification = function (txid, val, cb) {
      storage.set('txConfirmNotif-' + txid, val, cb)
    }

    root.getTxConfirmNotification = function (txid, cb) {
      storage.get('txConfirmNotif-' + txid, cb)
    }

    root.removeTxConfirmNotification = function (txid, cb) {
      storage.remove('txConfirmNotif-' + txid, cb)
    }

    return root
  })

'use strict'
/* global angular */
angular.module('canoeApp.services').factory('timeService', function () {
  var root = {}

  root.withinSameMonth = function (time1, time2) {
    if (!time1 || !time2) return false
    var date1 = new Date(time1)
    var date2 = new Date(time2)
    return root.getMonthYear(date1) === root.getMonthYear(date2)
  }

  root.withinPastDay = function (time) {
    var now = new Date()
    var date = new Date(time)
    return (now.getTime() - date.getTime()) < (1000 * 60 * 60 * 24)
  }

  root.isDateInCurrentMonth = function (date) {
    var now = new Date()
    return root.getMonthYear(now) === root.getMonthYear(date)
  }

  root.getMonthYear = function (date) {
    return date.getMonth() + date.getFullYear()
  }

  return root
})

'use strict';
angular.module('canoeApp.services').factory('txConfirmNotification', function txConfirmNotification($log, storageService) {
  var root = {};

  root.checkIfEnabled = function(txid, cb) {
    storageService.getTxConfirmNotification(txid, function(err, res) {
      if (err) $log.error(err);
      return cb(!!res);
    });
  };

  root.subscribe = function(client, opts) {
    client.txConfirmationSubscribe(opts, function(err, res) {
      if (err) $log.error(err);
      storageService.setTxConfirmNotification(opts.txid, true, function(err) {
        if (err) $log.error(err);
      });
    });
  };

  root.unsubscribe = function(client, txId) {
    client.txConfirmationUnsubscribe(txId, function(err, res) {
      if (err) $log.error(err);
      storageService.removeTxConfirmNotification(txId, function(err) {
        if (err) $log.error(err);
      });
    });
  };

  return root;

});

'use strict'

angular.module('canoeApp.services').factory('txFormatService', function ($filter, rateService, configService, lodash) {
  var root = {}

  //root.Utils = bwcService.getUtils()

  root.formatAmount = function (raw, fullPrecision) {
    var config = configService.getDefaults().wallet.settings
    if (config.unitCode === 'raw') return raw

    // TODO : now only works for english, specify opts to change thousand separator and decimal separator
    var opts = {
      fullPrecision: !!fullPrecision
    }
    return this.Utils.formatAmount(raw, config.unitCode, opts)
  }

  root.formatAmountStr = function (coin, raw) {
    if (isNaN(raw)) return
    return root.formatAmount(raw) + (coin ? coin.toUpperCase() : 'BCB')
  }

  root.toFiat = function (coin, raw, code, cb) {
    if (isNaN(raw)) return
    var val = function () {
      var v1 = rateService.toFiat(raw, code, coin)
      if (!v1) return null

      return v1.toFixed(2)
    }

    // Async version
    if (cb) {
      rateService.whenAvailable(function () {
        return cb(val())
      })
    } else {
      if (!rateService.isAvailable()) return null
      return val()
    };
  }

  root.formatToUSD = function (coin, raw, cb) {
    if (isNaN(raw)) return
    var val = function () {
      var v1 = rateService.toFiat(raw, 'USD', coin)
      if (!v1) return null

      return v1.toFixed(2)
    }

    // Async version
    if (cb) {
      rateService.whenAvailable(function () {
        return cb(val())
      })
    } else {
      if (!rateService.isAvailable()) return null
      return val()
    };
  }

  root.formatAlternativeStr = function (coin, raw, cb) {
    if (isNaN(raw)) return
    var config = configService.getSync().wallet.settings

    var val = function () {
      var v1 = parseFloat((rateService.toFiat(raw, config.alternativeIsoCode, coin)).toFixed(2))
      v1 = $filter('formatFiatAmount')(v1)
      if (!v1) return null

      return v1 + ' ' + config.alternativeIsoCode
    }

    // Async version
    if (cb) {
      rateService.whenAvailable(function () {
        return cb(val())
      })
    } else {
      if (!rateService.isAvailable()) return null
      return val()
    };
  }

  root.processTx = function (coin, tx) {
    if (!tx || tx.action == 'invalid')      { return tx}

    // New transaction output format
    if (tx.outputs && tx.outputs.length) {
      var outputsNr = tx.outputs.length

      if (tx.action != 'received') {
        if (outputsNr > 1) {
          tx.recipientCount = outputsNr
          tx.hasMultiplesOutputs = true
        }
        tx.amount = lodash.reduce(tx.outputs, function (total, o) {
          o.amountStr = root.formatAmountStr(coin, o.amount)
          o.alternativeAmountStr = root.formatAlternativeStr(coin, o.amount)
          return total + o.amount
        }, 0)
      }
      tx.toAddress = tx.outputs[0].toAddress
    }

    tx.amountStr = root.formatAmountStr(coin, tx.amount)
    tx.alternativeAmountStr = root.formatAlternativeStr(coin, tx.amount)
    tx.feeStr = root.formatAmountStr(coin, tx.fee || tx.fees)

    if (tx.amountStr) {
      tx.amountValueStr = tx.amountStr.split(' ')[0]
      tx.amountUnitStr = tx.amountStr.split(' ')[1]
    }

    return tx
  }

  root.formatPendingTxps = function (txps) {
    $scope.pendingTxProposalsCountForUs = 0
    var now = Math.floor(Date.now() / 1000)

    /* To test multiple outputs...
    var txp = {
      message: 'test multi-output',
      fee: 1000,
      createdOn: new Date() / 1000,
      outputs: []
    };
    function addOutput(n) {
      txp.outputs.push({
        amount: 600,
        toAddress: '2N8bhEwbKtMvR2jqMRcTCQqzHP6zXGToXcK',
        message: 'output #' + (Number(n) + 1)
      });
    };
    lodash.times(150, addOutput);
    txps.push(txp);
    */

    lodash.each(txps, function (tx) {
      // no future transactions...
      if (tx.createdOn > now)        { tx.createdOn = now}

      tx.account = profileService.getAccount(tx.accountId)
      if (!tx.account) {
        $log.error('no wallet at txp?')
        return
      }

      tx = txFormatService.processTx(tx.account.coin, tx)

      var action = lodash.find(tx.actions, {
        canoeerId: tx.account.canoeerId
      })

      if (!action && tx.status == 'pending') {
        tx.pendingForUs = true
      }

      if (action && action.type == 'accept') {
        tx.statusForUs = 'accepted'
      } else if (action && action.type == 'reject') {
        tx.statusForUs = 'rejected'
      } else {
        tx.statusForUs = 'pending'
      }

      if (!tx.deleteLockTime)        { tx.canBeRemoved = true}
    })

    return txps
  }

  root.parseAmount = function (coin, amount, currency) {
    var config = configService.getSync().wallet.settings
    var satToBtc = 1 / 100000000
    var unitToRaw = config.unitToRaw
    var amountUnitStr
    var amountSat
    var alternativeIsoCode = config.alternativeIsoCode

    // If fiat currency
    if (currency != 'BCH' && currency != 'BTC' && currency != 'raw') {
      amountUnitStr = $filter('formatFiatAmount')(amount) + ' ' + currency
      amountSat = rateService.fromFiat(amount, currency, coin).toFixed(0)
    } else if (currency == 'raw') {
      amountSat = amount
      amountUnitStr = root.formatAmountStr(coin, amountSat)
      // convert sat to BTC or BCH
      amount = (amountSat * satToBtc).toFixed(8)
      currency = (coin).toUpperCase()
    } else {
      amountSat = parseInt((amount * unitToRaw).toFixed(0))
      amountUnitStr = root.formatAmountStr(coin, amountSat)
      // convert unit to BTC or BCH
      amount = (amountSat * satToBtc).toFixed(8)
      currency = (coin).toUpperCase()
    }

    return {
      amount: amount,
      currency: currency,
      alternativeIsoCode: alternativeIsoCode,
      amountSat: amountSat,
      amountUnitStr: 'BCB' // amountUnitStr
    }
  }

  root.rawToUnit = function (amount) {
    var config = configService.getSync().wallet.settings
    var unitToRaw = config.unitToRaw
    var rawToUnit = 1 / unitToRaw
    var unitDecimals = config.unitDecimals
    return parseFloat((amount * rawToUnit).toFixed(unitDecimals))
  }

  return root
})

'use strict'
/* global angular */
angular.module('canoeApp.services')
  .factory('uxLanguage', function languageService ($log, lodash, gettextCatalog, amMoment, configService) {
    var root = {}

    root.currentLanguage = null

    // See https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    root.availableLanguages = [{
      name: 'العربية',
      isoCode: 'ar' // Arabic
    }, {
      name: 'български език',
      isoCode: 'bg' // Bulgarian
    }, {
      name: 'Čeština',
      isoCode: 'cs' // Czech
    }, {
      name: 'Dansk',
      isoCode: 'da' // Danish
    }, {
      name: 'Deutsch',
      isoCode: 'de' // German
    }, {
      name: 'English',
      isoCode: 'en' // English
    }, {
      name: 'Español',
      isoCode: 'es' // Spanish
    }, {
      name: 'Eesti keelt',
      isoCode: 'et' // Estonian
    }, {
      name: 'Français',
      isoCode: 'fr' // French
    }, {
      name: 'עברית',
      isoCode: 'he' // Hebrew
    }, {
      name: 'Hrvatski jezik',
      isoCode: 'hr' // Croatian
    }, {
      name: 'Italiano',
      isoCode: 'it' // Italian
    }, {
      name: 'Magyar',
      isoCode: 'hu' // Hungarian
    }, {
      name: 'Nederlands',
      isoCode: 'nl' // Dutch
    }, {
      name: 'Norsk Bokmål',
      isoCode: 'nb' // Norwegian Bokmål
    }, {
      name: 'Polski',
      isoCode: 'pl' // Polish
    }, {
      name: 'Português',
      isoCode: 'pt' // Portuguese
    }, {
      name: 'Português (Brazil)',
      isoCode: 'pt-br' // Portuguese Brazil
    }, {
      name: 'Română',
      isoCode: 'ro' // Romanian
    }, {
      name: '日本語',
      isoCode: 'ja', // Japanese
      useIdeograms: true
    }, {
      name: '中文（简体）',
      isoCode: 'zh', // Chinese Simplified
      useIdeograms: true
    }, {
      name: 'Pусский',
      isoCode: 'ru' // Russian
    }, {
      name: 'Slovenčina',
      isoCode: 'sk' // Slovak
    }, {
      name: 'Svenska',
      isoCode: 'sv' // Swedish
    }, {
      name: 'Tiếng Việt',
      isoCode: 'vi' // Vietnamese
    }]

    root._detect = function (cb) {
      var userLang
      if (navigator && navigator.globalization) {
        navigator.globalization.getPreferredLanguage(function (preferedLanguage) {
          // works for iOS and Android 4.x
          userLang = preferedLanguage.value
          userLang = userLang ? (userLang.split('-', 1)[0] || 'en') : 'en'
          // Set only available languages
          userLang = root.isAvailableLanguage(userLang)
          return cb(userLang)
        })
      } else {
        // Auto-detect browser language
        userLang = navigator.userLanguage || navigator.language
        userLang = userLang ? (userLang.split('-', 1)[0] || 'en') : 'en'
        // Set only available languages
        userLang = root.isAvailableLanguage(userLang)
        return cb(userLang)
      }
    }

    root.isAvailableLanguage = function (userLang) {
      return lodash.find(root.availableLanguages, {
        'isoCode': userLang
      }) ? userLang : 'en'
    }

    root._set = function (lang) {
      $log.debug('Setting default language: ' + lang)
      gettextCatalog.setCurrentLanguage(lang)
      root.currentLanguage = lang

      if (lang === 'zh') lang = lang + '-CN' // Fix for Chinese Simplified
      amMoment.changeLocale(lang)
    }

    root.getCurrentLanguage = function () {
      return root.currentLanguage
    }

    root.getCurrentLanguageName = function () {
      return root.getName(root.currentLanguage)
    }

    root.getCurrentLanguageInfo = function () {
      return lodash.find(root.availableLanguages, {
        'isoCode': root.currentLanguage
      })
    }

    root.getLanguages = function () {
      return root.availableLanguages
    }

    root.init = function (cb) {
      configService.whenAvailable(function (config) {
        var userLang = config.wallet.settings.defaultLanguage
        if (userLang && userLang !== root.currentLanguage) {
          root._set(userLang)
        } else {
          root._detect(function (lang) {
            root._set(lang)
          })
        }
        if (cb) return cb()
      })
    }

    root.getName = function (lang) {
      return lodash.result(lodash.find(root.availableLanguages, {
        'isoCode': lang
      }), 'name')
    }

    return root
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('accountDetailsController', function ($scope, $rootScope, $interval, $timeout, $filter, $log, $ionicModal, $ionicPopover, $state, $stateParams, $ionicHistory, profileService, nanoService, lodash, configService, platformInfo, externalLinkService, popupService, addressbookService, $ionicScrollDelegate, $window, gettextCatalog, timeService) {
  var HISTORY_SHOW_LIMIT = 10
  var currentTxHistoryPage = 0
  var listeners = []
  $scope.completeTxHistory = []
  $scope.isCordova = platformInfo.isCordova
  $scope.isAndroid = platformInfo.isAndroid
  $scope.isIOS = platformInfo.isIOS

  $scope.amountIsCollapsible = !$scope.isAndroid

  $scope.openExternalLink = function (url, target) {
    externalLinkService.open(url, target)
  }

  $scope.openSearchModal = function () {
    $scope.color = $scope.account.meta.color
    $scope.isSearching = true
    $scope.txHistorySearchResults = []
    $scope.filteredTxHistory = []

    $ionicModal.fromTemplateUrl('views/modals/search.html', {
      scope: $scope,
      focusFirstInput: true
    }).then(function (modal) {
      $scope.searchModal = modal
      $scope.searchModal.show()
    })

    $scope.close = function () {
      $scope.isSearching = false
      $scope.searchModal.hide()
    }

    $scope.openTx = function (tx) {
      $ionicHistory.nextViewOptions({
        disableAnimate: true
      })
      $scope.close()
      $scope.openTxModal(tx)
    }
  }

  $scope.openTxModal = function (ntx) {
    $scope.accountId = $scope.account.id
    $state.transitionTo('tabs.account.tx-details', {
      ntx: ntx,
      accountId: $scope.accountId
    })
  }

  var updateTxHistory = function () {
    $scope.completeTxHistory = $scope.account ? profileService.getTxHistory($scope.account.id) : []
    if ($scope.completeTxHistory[0]) {
      $scope.showNoTransactionsYetMsg = false
    } else {
      $scope.showNoTransactionsYetMsg = true
    }
    $scope.showHistory()
    $timeout(function () {
      $scope.$apply()
    })
  }

  $scope.showHistory = function () {
    if ($scope.completeTxHistory) {
      $scope.txHistory = $scope.completeTxHistory.slice(0, (currentTxHistoryPage + 1) * HISTORY_SHOW_LIMIT)
      $scope.txHistoryShowMore = $scope.completeTxHistory.length > $scope.txHistory.length
    }
  }

  $scope.getDate = function (txCreated) {
    var date = new Date(txCreated * 1000)
    return date
  }

  $scope.isFirstInGroup = function (index) {
    if (index === 0) {
      return true
    }
    var curTx = $scope.txHistory[index]
    var prevTx = $scope.txHistory[index - 1]
    return !$scope.createdDuringSameMonth(curTx, prevTx)
  }

  $scope.isLastInGroup = function (index) {
    if (index === $scope.txHistory.length - 1) {
      return true
    }
    return $scope.isFirstInGroup(index + 1)
  }

  $scope.createdDuringSameMonth = function (curTx, prevTx) {
    return timeService.withinSameMonth(curTx.time * 1000, prevTx.time * 1000)
  }

  $scope.createdWithinPastDay = function (time) {
    return timeService.withinPastDay(time)
  }

  $scope.isDateInCurrentMonth = function (date) {
    return timeService.isDateInCurrentMonth(date)
  }

  $scope.showMore = function () {
    $timeout(function () {
      currentTxHistoryPage++
      $scope.showHistory()
      $scope.$broadcast('scroll.infiniteScrollComplete')
    }, 100)
  }

  $scope.onRefresh = function () {
    $timeout(function () {
      $scope.$broadcast('scroll.refreshComplete')
    }, 300)
    $scope.updateAll()
  }

  $scope.updateAll = function (cb) {
    $scope.account = profileService.getAccountWithId($scope.accountId)
    updateTxHistory(cb)
  }

  $scope.hideToggle = function () {
    $scope.balanceHidden = !$scope.balanceHidden
    $timeout(function () {
      $scope.$apply()
    })
  }

  var prevPos

  function getScrollPosition () {
    var scrollPosition = $ionicScrollDelegate.getScrollPosition()
    if (!scrollPosition) {
      $window.requestAnimationFrame(function () {
        getScrollPosition()
      })
      return
    }
    var pos = scrollPosition.top
    if (pos === prevPos) {
      $window.requestAnimationFrame(function () {
        getScrollPosition()
      })
      return
    }
    prevPos = pos
    refreshAmountSection(pos)
  }

  function refreshAmountSection (scrollPos) {
    $scope.showBalanceButton = false
    if ($scope.status) {
      $scope.showBalanceButton = ($scope.status.totalBalanceSat !== $scope.status.spendableAmount)
    }
    if (!$scope.amountIsCollapsible) {
      var t = ($scope.showBalanceButton ? 15 : 45)
      $scope.amountScale = 'translateY(' + t + 'px)'
      return
    }

    scrollPos = scrollPos || 0
    var amountHeight = 210 - scrollPos
    if (amountHeight < 80) {
      amountHeight = 80
    }
    var contentMargin = amountHeight
    if (contentMargin > 210) {
      contentMargin = 210
    }

    var amountScale = (amountHeight / 210)
    if (amountScale < 0.5) {
      amountScale = 0.5
    }
    if (amountScale > 1.1) {
      amountScale = 1.1
    }

    var s = amountScale

    // Make space for the balance button when it needs to display.
    var TOP_NO_BALANCE_BUTTON = 115
    var TOP_BALANCE_BUTTON = 30
    var top = TOP_NO_BALANCE_BUTTON
    if ($scope.showBalanceButton) {
      top = TOP_BALANCE_BUTTON
    }

    var amountTop = ((amountScale - 0.7) / 0.7) * top
    if (amountTop < -10) {
      amountTop = -10
    }
    if (amountTop > top) {
      amountTop = top
    }

    t = amountTop

    $scope.altAmountOpacity = (amountHeight - 100) / 80
    $window.requestAnimationFrame(function () {
      $scope.amountHeight = amountHeight + 'px'
      $scope.contentMargin = contentMargin + 'px'
      $scope.amountScale = 'scale3d(' + s + ',' + s + ',' + s + ') translateY(' + t + 'px)'
      $scope.$digest()
      getScrollPosition()
    })
  }

  var scrollWatcherInitialized

  $scope.$on('$ionicView.enter', function (event, data) {
    if ($scope.isCordova && $scope.isAndroid) setAndroidStatusBarColor()
    if (scrollWatcherInitialized || !$scope.amountIsCollapsible) {
      return
    }
    scrollWatcherInitialized = true
  })

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    var clearCache = data.stateParams.clearCache
    $scope.accountId = data.stateParams.accountId
    var config = configService.getSync().wallet.settings
    $scope.alternativeIsoCode = config.alternativeIsoCode
    $scope.account = profileService.getAccountWithId($scope.accountId)
    if (!$scope.account) return

    $scope.balanceHidden = $scope.account.meta.balanceHidden

    // Getting info from cache
    if (clearCache) {
      $scope.txHistory = null
      $scope.status = null
    } else {
      $scope.status = $scope.account.cachedStatus
      if ($scope.account.completeHistory) {
        $scope.completeTxHistory = $scope.account.completeHistory
        $scope.showHistory()
      }
    }

    addressbookService.list(function (err, ab) {
      if (err) $log.error(err)
      $scope.addressbook = ab || {}
    })
  })

  $rootScope.$on('blocks', function (event, data) {
    $scope.updateAll()
    refreshAmountSection()
  })

  $scope.$on('$ionicView.afterEnter', function (event, data) {
    $scope.updateAll()
    refreshAmountSection()
  })

  $scope.$on('$ionicView.afterLeave', function (event, data) {
    if ($window.StatusBar) {
      var statusBarColor = '#192c3a'
      $window.StatusBar.backgroundColorByHexString(statusBarColor)
    }
  })

  $scope.$on('$ionicView.leave', function (event, data) {
    lodash.each(listeners, function (x) {
      x()
    })
  })

  function setAndroidStatusBarColor () {
    var SUBTRACT_AMOUNT = 15
    var walletColor
    if (!$scope.account.meta.color) walletColor = '#019477'
    else walletColor = $scope.account.meta.color
    var rgb = hexToRgb(walletColor)
    var keys = Object.keys(rgb)
    keys.forEach(function (k) {
      if (rgb[k] - SUBTRACT_AMOUNT < 0) {
        rgb[k] = 0
      } else {
        rgb[k] -= SUBTRACT_AMOUNT
      }
    })
    var statusBarColorHexString = rgbToHex(rgb.r, rgb.g, rgb.b)
    if ($window.StatusBar) { $window.StatusBar.backgroundColorByHexString(statusBarColorHexString) }
  }

  function hexToRgb (hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b
    })

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  function componentToHex (c) {
    var hex = c.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  function rgbToHex (r, g, b) {
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b)
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('addressbookListController', function ($scope, $log, $timeout, addressbookService, lodash, popupService, gettextCatalog, platformInfo) {
  var contacts

  var initAddressbook = function () {
    addressbookService.list(function (err, ab) {
      if (err) $log.error(err)

      $scope.isEmptyList = lodash.isEmpty(ab)

      if (!$scope.isEmptyList) $scope.showAddIcon = true
      else $scope.showAddIcon = false

      contacts = []
      lodash.each(ab, function (v, k) {
        contacts.push({
          name: lodash.isObject(v) ? v.name : v,
          address: k,
          email: lodash.isObject(v) ? v.email : null,
          alias: lodash.isObject(v) ? v.alias.alias : null,
          avatar: lodash.isObject(v) ? v.avatar : null
        })
      })
      $scope.addressbook = lodash.clone(contacts)
      $timeout(function () {
        $scope.$apply()
      })
    })
  }

  $scope.findAddressbook = function (search) {
    if (!search || search.length < 2) {
      $scope.addressbook = contacts
      $timeout(function () {
        $scope.$apply()
      }, 10)
      return
    }

    var result = lodash.filter(contacts, function (item) {
      var val = item.name
      return lodash.includes(val.toLowerCase(), search.toLowerCase())
    })

    $scope.addressbook = result
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.isChromeApp = platformInfo.isChromeApp
    $scope.showAddIcon = false
    $scope.addrSearch = { value: null }
    initAddressbook()
  })
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('addressbookAddController', function ($scope, $state, $stateParams, $timeout, $ionicHistory, gettextCatalog, aliasService, addressbookService, nanoService, popupService) {
  $scope.fromSendTab = $stateParams.fromSendTab

  $scope.addressbookEntry = {
    'address': $stateParams.addressbookEntry || '',
    'name': $stateParams.toName || '',
    'email': '',
    'alias': $stateParams.toAlias || ''
  }

  $scope.onQrCodeScannedAddressBook = function (data, addressbookForm) {
    $timeout(function () {
      var form = addressbookForm
      if (data && form) {
        nanoService.parseQRCode(data, function (err, code) {
          if (err) {
            // Trying to scan an incorrect QR code
            popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Incorrect code format for an account: ' + err))
            return
          }
          form.address.$setViewValue(code.account)
          form.address.$isValid = true
          form.address.$render()
          if (code.params.label) {
            form.name.$setViewValue(code.params.label)
            form.name.$render()
          }
          // if (code.params.alias) {
          //   form.alias.$setViewValue(code.alias)
          //   form.alias.$render()
          // }
        })
      }
      $scope.$digest()
    }, 100)
  }

  // var letterRegex = XRegExp('^\\p{Ll}+$');
  // var lnRegex = XRegExp('^(\\p{Ll}|\\pN)+$');
  // $scope.aliasValid = null;
  // $scope.aliasRegistered = null;
  // $scope.checkingAlias = false;
  // $scope.validateAlias = function(alias) {
  //   $scope.aliasRegistered = null;
  //   if (alias && alias.length > 0 && alias.charAt(0) === "@") {
  //     alias = alias.substring(1, alias.length);
  //   }
  //   $scope.aliasValid = alias.length >= 3 && letterRegex.test(alias.charAt(0)) && lnRegex.test(alias);
  //   $scope.checkingAlias = true;
  //   if ($scope.aliasValid === true) {
  //     aliasService.lookupAlias(alias, function(err, alias) {
  //       if (err === null) {
  //         $scope.aliasRegistered = true;
  //         $scope.addressbookEntry.address = alias.alias.address;
  //         $scope.addressbookEntry.name = "@"+alias.alias.alias;
  //         $scope.addressbookEntry.avatar = alias.alias.avatar;
  //       } else {
  //         $scope.aliasRegistered = false;
  //         $scope.addressbookEntry.avatar = null;
  //       }
  //       $scope.checkingAlias = false;
  //       $scope.$apply()
  //     });
  //   } else {
  //     $scope.checkingAlias = false;
  //   }
  // }

  $scope.$on('$ionicView.enter', function (event, data) {
    // if ($stateParams.toAlias !== null) {
    //   $scope.validateAlias($stateParams.toAlias);
    // }
  })

  $scope.add = function (entry) {
    $timeout(function () {
      addressbookService.add(entry, function (err, ab) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err)
          return
        }
        if ($scope.fromSendTab) $scope.goHome()
        else $ionicHistory.goBack()
      })
    }, 100)
  }

  $scope.goHome = function () {
    $ionicHistory.removeBackView()
    $state.go('tabs.home')
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('addressbookEditController', function ($scope, $state, $stateParams, $timeout, $ionicHistory, gettextCatalog, aliasService, addressbookService, nanoService, popupService) {
  $scope.fromSendTab = $stateParams.fromSendTab

  $scope.oldAddress = $stateParams.address
  $scope.addressbookEntry = {
    'address': $stateParams.address || '',
    'name': $stateParams.name || '',
    'email': $stateParams.email || '',
    'alias': $stateParams.alias || ''
  }

  $scope.onQrCodeScannedAddressBook = function (data, addressbookForm) {
    $timeout(function () {
      var form = addressbookForm
      if (data && form) {
        nanoService.parseQRCode(data, function (err, code) {
          if (err) {
            // Trying to scan an incorrect QR code
            popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Incorrect code format for an account: ' + err))
            return
          }
          form.address.$setViewValue(code.account)
          form.address.$isValid = true
          form.address.$render()
          if (code.params.label) {
            form.name.$setViewValue(code.params.label)
            form.name.$render()
          }
          // if (code.params.alias) {
          //   form.alias.$setViewValue(code.alias)
          //   form.alias.$render()
          // }
        })
      }
      $scope.$digest()
    }, 100)
  }
  // var letterRegex = XRegExp('^\\p{Ll}+$')
  // var lnRegex = XRegExp('^(\\p{Ll}|\\pN)+$')
  // $scope.aliasValid = null
  // $scope.aliasRegistered = null
  // $scope.checkingAlias = false
  // $scope.validateAlias = function (alias) {
  //   $scope.aliasRegistered = null
  //   if (alias && alias.length > 0 && alias.charAt(0) === '@') {
  //     alias = alias.substring(1, alias.length)
  //   }
  //   $scope.aliasValid = alias.length >= 3 && letterRegex.test(alias.charAt(0)) && lnRegex.test(alias)
  //   $scope.checkingAlias = true
  //   if ($scope.aliasValid === true) {
  //     aliasService.lookupAlias(alias, function (err, alias) {
  //       if (err === null) {
  //         $scope.aliasRegistered = true
  //         $scope.addressbookEntry.address = alias.alias.address
  //         $scope.addressbookEntry.name = '@' + alias.alias.alias
  //       } else if (err === 'Could not find alias') {
  //         $scope.aliasRegistered = false
  //       }
  //       $scope.checkingAlias = false
  //       $scope.$apply()
  //     })
  //   } else {
  //     $scope.checkingAlias = false
  //   }
  // }

  $scope.save = function (entry) {
    $timeout(function () {
      addressbookService.save(entry, $scope.oldAddress, function (err, ab) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err)
          return
        }
        if ($scope.fromSendTab) {
          $scope.goHome()
        } else {
          $state.go('tabs.addressbook')
        }
      })
    }, 100)
  }

  $scope.goHome = function () {
    $ionicHistory.removeBackView()
    $state.go('tabs.home')
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('addressbookViewController', function ($scope, $state, $timeout, lodash, addressbookService, popupService, $ionicHistory, platformInfo, gettextCatalog, nanoService) {
  $scope.isChromeApp = platformInfo.isChromeApp
  $scope.addressbookEntry = {}

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.addressbookEntry = {}
    $scope.addressbookEntry.address = data.stateParams.address
    $scope.addressbookEntry.name = data.stateParams.name
    $scope.addressbookEntry.email = data.stateParams.email
    $scope.addressbookEntry.alias = data.stateParams.alias
    nanoService.isValidAccount($scope.addressbookEntry.address)
  })

  $scope.edit = function () {
    $ionicHistory.removeBackView()
    $timeout(function () {
      $state.transitionTo('tabs.addressbook.edit', {
        address: $scope.addressbookEntry.address,
        name: $scope.addressbookEntry.name,
        email: $scope.addressbookEntry.email,
        alias: $scope.addressbookEntry.alias
      })
    }, 100)
  }

  $scope.sendTo = function () {
    $ionicHistory.removeBackView()
    $state.go('tabs.send')
    $timeout(function () {
      $state.transitionTo('tabs.send.amount', {
        recipientType: 'contact',
        toAddress: $scope.addressbookEntry.address,
        toName: $scope.addressbookEntry.name,
        toEmail: $scope.addressbookEntry.email,
        toAlias: $scope.addressbookEntry.alias
      })
    }, 100)
  }

  $scope.remove = function (addr) {
    var title = gettextCatalog.getString('Warning!')
    var message = gettextCatalog.getString('Are you sure you want to delete this contact?')
    popupService.showConfirm(title, message, null, null, function (res) {
      if (!res) return
      addressbookService.remove(addr, function (err, ab) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err)
          return
        }
        $ionicHistory.goBack()
      })
    })
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('advancedSettingsController', function ($scope, $log, $ionicHistory, $timeout, $state, configService, nanoService, popupService, platformInfo, gettextCatalog) {
  var updateConfig = function () {
    var config = configService.getSync()

    var value
    // For now we only allow choosing on NWjs Linux
    if (platformInfo.isLinux) {
      value = config.wallet.serverSidePoW
      $scope.serverSidePoWDisabled = false
    } else {
      value = true
      $scope.serverSidePoWDisabled = true
      if (config.wallet.serverSidePoW !== true) {
        $log.debug('Forced server side PoW to true')
        // Old value, change to true
        $scope.serverSidePoW = {
          value: value
        }
        $scope.serverSidePoWChange()
      }
    }

    $scope.playSounds = {
      value: config.wallet.playSounds
    }

    $scope.serverSidePoW = {
      value: value
    }
  }

  $scope.repair = function () {
    var title = gettextCatalog.getString('Warning!')
    var message = gettextCatalog.getString('Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?')
    popupService.showConfirm(title, message, null, null, function (res) {
      if (!res) return
      nanoService.repair()
      $ionicHistory.goBack()
    })
  }

  $scope.changeBackend = function () {
    $ionicHistory.removeBackView()
    $timeout(function () {
      $state.transitionTo('tabs.advanced.changeBackend')
    }, 100)
  }

  $scope.serverSidePoWChange = function () {
    var opts = {
      wallet: {
        serverSidePoW: $scope.serverSidePoW.value
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
    })
  }

  $scope.playSoundsChange = function () {
    var opts = {
      wallet: {
        playSounds: $scope.playSounds.value
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    updateConfig()
  })
})

'use strict'
/* global angular BigNumber */
angular.module('canoeApp.controllers').controller('amountController', function ($scope, $timeout, $ionicScrollDelegate, $ionicHistory, gettextCatalog, platformInfo, lodash, configService, aliasService, $stateParams, $window, $state, $log, profileService, nodeWebkitService, storageService) {
  var _id
  var unitToRaw
  var rawToUnit
  var unitDecimals
  var SMALL_FONT_SIZE_LIMIT = 10
  var LENGTH_EXPRESSION_LIMIT = 19
  var isNW = platformInfo.isNW
  var rawPerNano = BigNumber('10000000000000000000000000000')

  var unitIndex = 0
  var altUnitIndex = 0
  var availableUnits = []
  var fiatCode

  var fixedUnit

  // Avoid 15 signific digit error
  BigNumber.config({ ERRORS: false })

  $scope.isChromeApp = platformInfo.isChromeApp

  $scope.$on('$ionicView.leave', function () {
    angular.element($window).off('keydown')
  })

  $scope.onAccountSelect = function (acc) {
    if (!acc) {
      $state.go('tabs.create-account')
    } else {
      $scope.acc = acc
      $scope.account = acc
    }
  }

  $scope.showAccountSelector = function () {
    if ($scope.singleAccount) return
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.showAccounts = true
  }

  var checkSelectedAccount = function (account, accounts) {
    if (!account) return accounts[0]
    var w = lodash.find(accounts, function (w) {
      return w.id === account.id
    })
    if (!w) return accounts[0]
    return w
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    var config = configService.getSync().wallet.settings
    $scope.recipientType = data.stateParams.recipientType || null
    $scope.toAddress = data.stateParams.toAddress
    $scope.toName = data.stateParams.toName
    $scope.toEmail = data.stateParams.toEmail
    $scope.toColor = data.stateParams.toColor
    $scope.toAlias = data.stateParams.toAlias
    $scope.fromAddress = data.stateParams.fromAddress
    aliasService.getAvatar(data.stateParams.toAlias, function (err, avatar) {
      $scope.toAvatar = avatar
      $scope.$apply()
    })
    $scope.accounts = profileService.getAccounts()
    $scope.singleAccount = $scope.accounts.length === 1
    $scope.hasAccounts = !lodash.isEmpty($scope.accounts)
    if ($scope.fromAddress) {
      $scope.acc = {
        id: $scope.fromAddress
      }
    }
    var selectedAccount = checkSelectedAccount($scope.acc, $scope.accounts)
    $scope.onAccountSelect(selectedAccount)
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.hasMoreAccounts = $scope.accounts.length > 1
    function setAvailableUnits() {
      availableUnits = []

      availableUnits.push({
        name: 'BCB',
        id: 'bcb',
        shortName: 'BCB'
      })

      unitIndex = 0

      if (data.stateParams.coin) {
        var coins = data.stateParams.coin.split(',')
        var newAvailableUnits = []

        lodash.each(coins, function (c) {
          var coin = lodash.find(availableUnits, {
            id: c
          })
          if (!coin) {
            $log.warn('Could not find desired coin:' + data.stateParams.coin)
          } else {
            newAvailableUnits.push(coin)
          }
        })

        if (newAvailableUnits.length > 0) {
          availableUnits = newAvailableUnits
        }
      }

      //  currency have preference
      var fiatName
      if (data.stateParams.currency) {
        fiatCode = data.stateParams.currency
        altUnitIndex = unitIndex
        unitIndex = availableUnits.length
      } else {
        fiatCode = config.alternativeIsoCode || 'USD'
        fiatName = config.alternanativeName || fiatCode
        altUnitIndex = availableUnits.length
      }

      availableUnits.push({
        name: fiatName || fiatCode,
        // TODO
        id: fiatCode,
        shortName: fiatCode,
        isFiat: true
      })

      storageService.getAmountInputDefaultCurrency(function (err, amountInputDefaultCurrency) {
        config.amountInputDefaultCurrency = amountInputDefaultCurrency ? amountInputDefaultCurrency : 'BCB'
      })
      if (!config.amountInputDefaultCurrency || config.amountInputDefaultCurrency === 'BCB') {
        unitIndex = 0
        altUnitIndex = 1
      } else {
        unitIndex = 1
        altUnitIndex = 0
      }

      if (data.stateParams.fixedUnit) {
        fixedUnit = true
      }
    };

    // Go to...
    _id = data.stateParams.id // Optional (BitPay Card ID or Wallet ID)
    $scope.nextStep = data.stateParams.nextStep

    setAvailableUnits()
    updateUnitUI()

    $scope.showMenu = $ionicHistory.backView() && ($ionicHistory.backView().stateName === 'tabs.send')
    $scope.showSendMax = false

    if (!$scope.nextStep && !data.stateParams.toAddress) {
      $log.error('Bad params at amount')
      throw ('bad params')
    }

    var reNr = /^[1234567890\.]$/
    var reOp = /^[\*\+\-\/]$/

    var disableKeys = angular.element($window).on('keydown', function (e) {
      if (!e.key) return
      if (e.which === 8) { // you can add others here inside brackets.
        e.preventDefault()
        $scope.removeDigit()
      }

      if (e.key.match(reNr)) {
        $scope.pushDigit(e.key)
      } else if (e.key.match(reOp)) {
        $scope.pushOperator(e.key)
      } else if (e.keyCode === 86) {
        if (e.ctrlKey || e.metaKey) processClipboard()
      } else if (e.keyCode === 13) $scope.finish()

      $timeout(function () {
        $scope.$apply()
      })
    })
    $scope.specificAmount = $scope.specificAlternativeAmount = ''
    $scope.isCordova = platformInfo.isCordova
    unitToRaw = BigNumber(config.unitToRaw)
    rawToUnit = 1 / unitToRaw
    unitDecimals = config.unitDecimals

    $scope.resetAmount()

    // in raw always
    if ($stateParams.toAmount) {
      $scope.amount = (($stateParams.toAmount) * rawToUnit).toFixed(unitDecimals)
    }

    processAmount()

    $timeout(function () {
      $ionicScrollDelegate.resize()
    }, 10)
  })

  function paste(value) {
    $scope.amount = value
    processAmount()
    $timeout(function () {
      $scope.$apply()
    })
  };

  function processClipboard() {
    if (!isNW) return
    var value = nodeWebkitService.readFromClipboard()
    if (value && evaluate(value) > 0) paste(evaluate(value))
  };

  $scope.showSendMaxMenu = function () {
    $scope.showSendMax = true
  }

  $scope.sendMax = function () {
    if (availableUnits[unitIndex].isFiat) {
      $scope.changeUnit()
      $scope.sendMax()
    } else {
      $scope.amount = new BigNumber($scope.acc.balance.toString()).dividedBy(rawPerNano).toString()
      processAmount()
    }
    // $scope.showSendMax = false
    // $scope.useSendMax = true
    // $scope.finish()
  }

  $scope.toggleAlternative = function () {
    if ($scope.amount && isExpression($scope.amount)) {
      var amount = evaluate(format($scope.amount))
      $scope.globalResult = '= ' + processResult(amount)
    }
  }

  function updateUnitUI() {
    $scope.unit = availableUnits[unitIndex].shortName
    $scope.alternativeUnit = availableUnits[altUnitIndex].shortName
    processAmount()
    $log.debug('Update unit coin @amount unit:' + $scope.unit + ' alternativeUnit:' + $scope.alternativeUnit)
  };

  $scope.changeUnit = function () {
    if (fixedUnit) return

    var config = configService.getSync().wallet.settings
    unitIndex++
    if (unitIndex >= availableUnits.length) unitIndex = 0

    if (availableUnits[unitIndex].isFiat) {
      config.amountInputDefaultCurrency = availableUnits[1].shortName
      altUnitIndex = 0
    } else {
      config.amountInputDefaultCurrency = 'BCB'
      altUnitIndex = lodash.findIndex(availableUnits, {
        isFiat: true
      })
    }

    storageService.setAmountInputDefaultCurrency(config.amountInputDefaultCurrency, function () { })

    updateUnitUI()
  }

  $scope.changeAlternativeUnit = function () {
    // Do nothing if fiat is not main unit
    if (!availableUnits[unitIndex].isFiat) return

    var nextCoin = lodash.findIndex(availableUnits, function (x) {
      if (x.isFiat) return false
      if (x.id === availableUnits[altUnitIndex].id) return false
      return true
    })

    if (nextCoin >= 0) {
      altUnitIndex = nextCoin
      updateUnitUI()
    }
  }

  function checkFontSize() {
    if ($scope.amount && $scope.amount.length >= SMALL_FONT_SIZE_LIMIT) $scope.smallFont = true
    else $scope.smallFont = false
  };

  $scope.pushDigit = function (digit) {
    if ($scope.amount && $scope.amount.length >= LENGTH_EXPRESSION_LIMIT) return
    if ($scope.amount.indexOf('.') > -1 && digit === '.') return
    if (availableUnits[unitIndex].isFiat && $scope.amount.indexOf('.') > -1 && $scope.amount[$scope.amount.indexOf('.') + 2]) return

    $scope.amount = ($scope.amount + digit).replace('..', '.')
    processAmount()
  }

  $scope.pushOperator = function (operator) {
    if (!$scope.amount || $scope.amount.length == 0) return
    $scope.amount = _pushOperator($scope.amount)

    function _pushOperator(val) {
      if (!isOperator(lodash.last(val))) {
        return val + operator
      } else {
        return val.slice(0, -1) + operator
      }
    };
  }

  function isOperator(val) {
    var regex = /[\/\-\+\x\*]/
    return regex.test(val)
  };

  function isExpression(val) {
    var regex = /^\.?\d+(\.?\d+)?([\/\-\+\*x]\d?\.?\d+)+$/
    return regex.test(val)
  };

  $scope.removeDigit = function () {
    $scope.amount = ($scope.amount).toString().slice(0, -1)
    processAmount()
  }

  $scope.resetAmount = function () {
    $scope.amount = $scope.alternativeAmount = $scope.globalResult = ''
    $scope.allowSend = false
    checkFontSize()
  }

  function processAmount() {
    checkFontSize()
    var formatedValue = format($scope.amount)
    var result = evaluate(formatedValue)
    $scope.allowSend = lodash.isNumber(result) && +result > 0
    if (lodash.isNumber(result)) {
      $scope.globalResult = isExpression($scope.amount) ? '= ' + processResult(result) : ''

      if (availableUnits[unitIndex].isFiat) {
        var a = fromFiat(result)
        if (a) {
          $scope.alternativeAmount = a
        } else {
          if (result) {
            $scope.alternativeAmount = 'N/A'
          } else {
            $scope.alternativeAmount = null
          }
          $scope.allowSend = false
        }
      } else {
        $scope.alternativeAmount = toFiat(result)
      }
    }
  }

  function processResult(val) {
    return profileService.formatAmount(new BigNumber(unitDecimals).times(unitToRaw))
  }

  function fromFiat(val) {
    return profileService.fromFiat(val, fiatCode, availableUnits[altUnitIndex].id) * rawToUnit
  }

  function toFiat(val) {
    return profileService.toFiat(val * unitToRaw, fiatCode, availableUnits[unitIndex].id)
  }

  function evaluate(val) {
    var result
    try {
      result = $scope.$eval(val)
    } catch (e) {
      return 0
    }
    if (!lodash.isFinite(result)) return 0
    return result
  }

  function format(val) {
    if (!val) return
    var result = val.toString()
    if (isOperator(lodash.last(val))) result = result.slice(0, -1)
    return result.replace('x', '*')
  }

  $scope.finish = function () {
    var unit = availableUnits[unitIndex]
    var _amount = evaluate(format($scope.amount))
    var coin = unit.id
    if (unit.isFiat) {
      coin = availableUnits[altUnitIndex].id
    }

    if ($scope.nextStep) {
      $state.transitionTo($scope.nextStep, {
        id: _id,
        amount: $scope.useSendMax ? null : _amount,
        currency: unit.id.toUpperCase(),
        coin: coin,
        useSendMax: $scope.useSendMax
      })
    } else {
      var amount = _amount
      var big
      if (unit.isFiat) {
        big = new BigNumber(fromFiat(amount))
        amount = (big.times(unitToRaw)).toFixed(0)
      } else {
        big = new BigNumber(amount)
        amount = (big.times(unitToRaw)).toFixed(0)
      }
      $state.transitionTo('tabs.send.confirm', {
        recipientType: $scope.recipientType,
        toAmount: amount,
        toAddress: $scope.toAddress,
        fromAddress: $scope.acc.id,
        toName: $scope.toName,
        toEmail: $scope.toEmail,
        toColor: $scope.toColor,
        toAlias: $scope.toAlias,
        useSendMax: $scope.useSendMax
      })
    }
    $scope.useSendMax = null
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('backController', function ($scope, $state, $stateParams) {
  $scope.importGoBack = function () {
    if ($stateParams.fromOnboarding) $state.go('onboarding.welcome')
    else $state.go('tabs.create-account')
  }

  $scope.onboardingMailSkip = function () {
    $state.go('onboarding.backupRequest')
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('backupController',
  function ($scope, $timeout, $log, $state, $stateParams, $ionicHistory, profileService, nanoService, popupService, gettextCatalog, $ionicModal) {
    $scope.wallet = profileService.getWallet()

    $scope.setFlow = function (step) {
      $scope.data = {}
      $scope.seedLines = nanoService.splitSeed(profileService.getSeed())
      $scope.data.passphrase = null
      $scope.step = step || 1
      $scope.selectComplete = false
      $scope.backupError = false

      $timeout(function () {
        $scope.$apply()
      }, 10)
    }

    function openConfirmBackupModal () {
      $ionicModal.fromTemplateUrl('views/includes/confirmBackupPopup.html', {
        scope: $scope,
        backdropClickToClose: false,
        hardwareBackButtonClose: false
      }).then(function (modal) {
        $scope.confirmBackupModal = modal
        $scope.confirmBackupModal.show()
      })
    }

    var showBackupResult = function () {
      if ($scope.backupError) {
        var title = gettextCatalog.getString('Uh oh...')
        var message = gettextCatalog.getString("It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.")
        popupService.showAlert(title, message, function () {
          $scope.setFlow(2)
        })
      } else {
        profileService.setBackupFlag()
        openConfirmBackupModal()
      }
    }

    $scope.closeBackupResultModal = function () {
      $scope.confirmBackupModal.hide()
      $scope.confirmBackupModal.remove()

      profileService.isDisclaimerAccepted(function (val) {
        if (val) {
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
        } else {
          $state.go('onboarding.disclaimer', {
            walletId: $stateParams.walletId,
            backedUp: true
          })
        }
      })
    }

    var finalStep = function () {
      showBackupResult()
    }

    $scope.goToStep = function (n) {
      if (n === 1) { $scope.setFlow() }
      if (n === 2) { $scope.step = 2 }
      if (n === 3) { $scope.step = 3 }
      if (n === 4) { finalStep() }
    }

    $scope.$on('$ionicView.enter', function (event, data) {
      $scope.deleted = (profileService.getSeed() === null)
      if ($scope.deleted) {
        $log.debug('Bad password or no wallet')
        return
      }
      $scope.setFlow()
    })
  })

'use strict';

angular.module('canoeApp.controllers').controller('buyAndSellCardController', function($scope, $ionicScrollDelegate, buyAndSellService) {

  $scope.services = buyAndSellService.getLinked();

  $scope.toggle = function() {
    $scope.hide = !$scope.hide;
    $timeout(function() {
      $ionicScrollDelegate.resize();
      $scope.$apply();
    }, 10);
  };
});

'use strict';

angular.module('canoeApp.controllers').controller('buyandsellController', function($scope, $ionicHistory, buyAndSellService, lodash) {

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    $scope.services = buyAndSellService.get();

    if (lodash.isEmpty($scope.services))
      $ionicHistory.goBack();
  });
});

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changeBackendController', function ($scope, $timeout, nanoService) {
  $scope.serverURL = ''

  $scope.changeBackend = function (url) {
    nanoService.setHost(url)
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.serverURL = nanoService.getHost()
    $timeout(function () {
      $scope.$apply()
    })
  })
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changeLocksController', function ($scope, $state, $timeout, $log, $ionicHistory, fingerprintService, popupService, configService, applicationService, platformInfo, gettextCatalog) {
  $scope.saveLockTypeA = function (lockType) {
    $scope.lockTypeSoft = lockType
  }

  $scope.saveLockTypeBackground = function (lockType) {
    $scope.lockTypeBackground = lockType
  }

  $scope.save = function (timeoutSoft, timeoutHard) {
    var opts = {
      wallet: {
        timeoutSoft: timeoutSoft,
        timeoutHard: timeoutHard,
        lockTypeSoft: $scope.lockTypeSoft,
        lockTypeBackground: $scope.lockTypeBackground
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      applicationService.configureLock(opts.wallet)
      popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Saved'))
      $ionicHistory.removeBackView()
      $state.go('tabs.home')
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    var config = configService.getSync()
    $scope.enabledFingerprint = fingerprintService.isAvailable()
    $scope.enabledBackground = platformInfo.isMobile
    $scope.timeoutSoft = config.wallet.timeoutSoft
    $scope.lockTypeSoft = config.wallet.lockTypeSoft
    $scope.timeoutHard = config.wallet.timeoutHard
    $scope.lockTypeBackground = config.wallet.lockTypeBackground
    $timeout(function () {
      $scope.$apply()
    })
  })
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('changePasswordController', function ($scope, $state, $timeout, $log, $ionicHistory, profileService, popupService, gettextCatalog) {
  $scope.oldPassword = ''
  $scope.password = ''
  $scope.confirmPassword = ''
  $scope.typePassword1 = false
  $scope.typePassword2 = false
  $scope.typePassword3 = false

  $scope.changePass = function (pw, oldPw) {
    if (!profileService.checkPassword(oldPw)) {
      popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Your old password was not entered correctly'))
    } else {
      profileService.changePass(pw, oldPw)
      popupService.showAlert(gettextCatalog.getString('Information'), gettextCatalog.getString('Your password has been changed'))
      $ionicHistory.removeBackView()
      $state.go('tabs.home')
    }
  }

  $scope.togglePassword = function (typePasswordStr) {
   $scope[typePasswordStr] = !$scope[typePasswordStr]
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.oldPassword = ''
    $scope.password = ''
    $scope.confirmPassword = ''
    $timeout(function () {
      $scope.$apply()
    })
  })
})

'use strict'
/* global angular BigNumber */
angular.module('canoeApp.controllers').controller('confirmController', function ($rootScope, $scope, $interval, $filter, $timeout, $ionicScrollDelegate, gettextCatalog, platformInfo, lodash, configService, aliasService, $stateParams, $window, $state, $log, profileService, ongoingProcess, popupService, $ionicHistory, $ionicConfig, externalLinkService, addressbookService) {
  // Avoid 15 signific digit error
  BigNumber.config({ ERRORS: false })

  var tx = {}

  // Config Related values
  var config = configService.getSync()
  var walletConfig = config.wallet
  var unitToRaw = walletConfig.settings.unitToRaw
  // var unitDecimals = walletConfig.settings.unitDecimals
  // var rawToUnit = 1 / unitToRaw
  // var configFeeLevel = walletConfig.settings.feeLevel ? walletConfig.settings.feeLevel : 'normal'

  // Platform info
  var isChromeApp = platformInfo.isChromeApp
  var isCordova = platformInfo.isCordova
  var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
  var unitToRaw

  function refresh () {
    $timeout(function () {
      $scope.$apply()
    }, 10)
  }

  $scope.showAccountSelector = function () {
    $scope.accountSelector = true
    refresh()
  }

  $scope.$on('$ionicView.beforeLeave', function (event, data) {
    $ionicConfig.views.swipeBackEnabled(true)
  })

  $scope.$on('$ionicView.enter', function (event, data) {
    $ionicConfig.views.swipeBackEnabled(false)
  })

  function exitWithError (err) {
    $log.info('Error setting account selector:' + err)
    popupService.showAlert(gettextCatalog.getString(), err, function () {
      $ionicHistory.nextViewOptions({
        disableAnimate: true,
        historyRoot: true
      })
      $ionicHistory.clearHistory()
      $state.go('tabs.send')
    })
  };

  function setNoAccount (msg, criticalError) {
    $scope.account = null
    $scope.noAccountMessage = msg
    $scope.criticalError = criticalError
    $log.warn('Not ready to make the payment:' + msg)
    $timeout(function () {
      $scope.$apply()
    })
  };

  var checkSelectedAccount = function (account, accounts) {
    if (!account) return accounts[0]
    var w = lodash.find(accounts, function (w) {
      return w.id === account.id
    })
    if (!w) return accounts[0]
    return w
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    function setAccountSelector (minAmount, cb) {
      // no min amount? (sendMax) => look for no empty wallets
      minAmount = minAmount || 1

      // Make sure we have latest accounts and balances
      $scope.accounts = profileService.getAccounts()

      // Needed to show back button when coming from tx-details (refund)
      data.enableBack = true

      if (!$scope.accounts || !$scope.accounts.length) {
        setNoAccount(gettextCatalog.getString('No accounts available'), true)
        return cb()
      }

      var filteredAccounts = []
      lodash.each($scope.accounts, function (acc) {
        if (!acc.balance) { $log.debug('No balance available in: ' + acc.name) }
        if (parseInt(acc.balance) >= minAmount) {
          filteredAccounts.push(acc)
        }
      })

      if (lodash.isEmpty(filteredAccounts)) {
        setNoAccount(gettextCatalog.getString('Insufficient funds'), true)
      }

      $scope.accounts = lodash.clone(filteredAccounts)
      return cb()
    }

    // Grab stateParams
    tx = {
      toAmount: data.stateParams.toAmount,
      sendMax: data.stateParams.useSendMax === 'true',
      toAddress: data.stateParams.toAddress,
      description: data.stateParams.description,
      isManta: data.stateParams.isManta,

      // Vanity tx info (not in the real tx)
      recipientType: data.stateParams.recipientType || null,
      toName: data.stateParams.toName,
      toEmail: data.stateParams.toEmail,
      toColor: data.stateParams.toColor,
      txp: {}
    }
    $scope.accounts = profileService.getAccounts()
    $scope.toAddress = data.stateParams.toAddress
    $scope.fromAddress = data.stateParams.fromAddress
    if ($scope.fromAddress) {
      $scope.acc =  {
        id: $scope.fromAddress
      }
    }
    var selectedAccount = checkSelectedAccount($scope.acc, $scope.accounts)
    $scope.onAccountSelect(selectedAccount)
    $scope.toName = data.stateParams.toName
    $scope.toAlias = data.stateParams.toAlias
    tx.toAlias = $scope.toAlias
    aliasService.getAvatar(data.stateParams.toAlias, function (err, avatar) {
      $scope.toAvatar = avatar
      $scope.$apply()
      tx.toAvatar = avatar
    })
    $scope.toEmail = data.stateParams.toEmail
    $scope.toColor = data.stateParams.toColor
    $scope.recipientType = data.stateParams.recipientType || null

    // Other Scope vars
    $scope.isChromeApp = isChromeApp
    $scope.isCordova = isCordova
    $scope.isWindowsPhoneApp = isWindowsPhoneApp
    $scope.showAddress = false
    $scope.data = data

    $scope.accountSelectorTitle = gettextCatalog.getString('Send from')

    setAccountSelector(tx.toAmount, function (err) {
      if (err) {
        return exitWithError('Could not update accounts')
      }
      if (!$scope.account) {
        if ($scope.accounts.length > 1) {
          $scope.showAccountSelector()
        } else if ($scope.accounts.length) {
          setAccount($scope.accounts[0], tx)
        }
      }
    })
  })

  function getTxp (tx, account, dryRun, cb) {
    /*
    if (tx.toAmount > Number.MAX_SAFE_INTEGER) {
      var msg = gettextCatalog.getString('Amount too big')
      $log.warn(msg)
      return setSendError(msg)
    } */
    var txp = {}
    txp.account = account
    txp.address = tx.toAddress
    txp.amount = tx.toAmount
    txp.message = tx.description
    txp.isManta = tx.isManta
    txp.dryRun = dryRun
    return cb(null, txp)
  }

  function updateTx (tx, account, opts, cb) {
    if (opts.clearCache) {
      tx.txp = {}
    }

    $scope.tx = tx

    function updateAmount () {
      if (!tx.toAmount) return
      // Amount
      tx.amountStr = profileService.formatAmountWithUnit(tx.toAmount) // txFormatService.formatAmountStr(null, tx.toAmount)
      tx.amountValueStr = tx.amountStr.split(' ')[0]
      tx.amountUnitStr = tx.amountStr.split(' ')[1]
      tx.alternativeAmountStr = toFiat(new BigNumber(tx.toAmount).dividedBy(unitToRaw))
    }

    updateAmount()
    refresh()

    // End of quick refresh, before wallet is selected.
    if (!account) {
      return cb()
    }
  }

  function toFiat (val) {
    return profileService.toFiat(new BigNumber(val).times(unitToRaw), walletConfig.settings.alternativeIsoCode)
  }

  function useSelectedWallet () {
    if (!$scope.useSendMax) {
      showAmount(tx.toAmount)
    }

    $scope.onAccountSelect($scope.account)
  }

  function setButtonText () {
    if (isCordova && !isWindowsPhoneApp) {
      $scope.buttonText = gettextCatalog.getString('Slide to send')
    } else {
      $scope.buttonText = gettextCatalog.getString('Click to send')
    }
  }

  $scope.toggleAddress = function () {
    $scope.showAddress = !$scope.showAddress
  }

  $scope.onAccountSelect = function (account) {
    setAccount(account, tx)
  }

  $scope.showDescriptionPopup = function (tx) {
    var message = gettextCatalog.getString('Add description')
    var opts = {
      defaultText: tx.description
    }

    popupService.showPrompt(null, message, opts, function (res) {
      if (typeof res !== 'undefined') tx.description = res
      $timeout(function () {
        $scope.$apply()
      })
    })
  }

  // Sets a account on the UI, creates a TXPs for that wallet
  function setAccount (account, tx) {
    $scope.account = account

    setButtonText()

    // Send max fix
    if (tx.sendMax) {
      tx.toAmount = $scope.account.balance
    }

    updateTx(tx, account, {
      dryRun: true
    }, function (err) {
      $timeout(function () {
        $ionicScrollDelegate.resize()
        $scope.$apply()
      }, 10)
    })
  };

  var setSendError = function (msg) {
    $scope.sendStatus = ''
    $timeout(function () {
      $scope.$apply()
    })
    popupService.showAlert(gettextCatalog.getString('Error at confirm'), msg)
  }

  $scope.cancel = function () {
    $scope.payproModal.hide()
  }

  $scope.approve = function (tx, account, onSendStatusChange) {
    if (!tx || !account) return

    ongoingProcess.set('creatingTx', true, onSendStatusChange)
    getTxp(lodash.clone(tx), account, false, function (err, txp) {
      ongoingProcess.set('creatingTx', false, onSendStatusChange)
      if (err) return

      // confirm txs for more than 20 usd, if not spending/touchid is enabled
      function confirmTx (cb) {
        // var amountUsd = parseFloat(txFormatService.formatToUSD(null, txp.amount))
        // if (amountUsd <= CONFIRM_LIMIT_USD) { return cb() }

        var message = gettextCatalog.getString('Sending {{amountStr}} from your {{name}} account', {
          amountStr: tx.amountStr,
          name: account.name
        })
        var okText = gettextCatalog.getString('Confirm')
        var cancelText = gettextCatalog.getString('Cancel')
        popupService.showConfirm(null, message, okText, cancelText, function (ok) {
          return cb(!ok)
        })
      }

      function doSend () {
        ongoingProcess.set('sendingTx', true, onSendStatusChange)
        profileService.send(txp, function (err) {
          if (err) return setSendError(err)
          ongoingProcess.set('sendingTx', false, onSendStatusChange)
        })
      }
      doSend()
    })
  }

  function statusChangeHandler (processName, showName, isOn) {
    if (
      (
        (processName === 'sendingTx')
      ) && !isOn) {
      $scope.sendStatus = 'success'
      $timeout(function () {
        $scope.$digest()
      }, 100)
    } else if (showName) {
      $scope.sendStatus = showName
    }
  }

  $scope.statusChangeHandler = statusChangeHandler

  $scope.onSuccessConfirm = function () {
    $scope.sendStatus = ''
    $ionicHistory.nextViewOptions({
      disableAnimate: true,
      historyRoot: true
    })
    $state.go('tabs.send').then(function () {
      $ionicHistory.clearHistory()
      addressbookService.get($scope.tx.toAddress, function (err, addr) {
        // Popup : proposal to add new address to address book, if it's not already there
        // and if it's not the address of one of wallet accounts
        if (!addr && !profileService.getAccount($scope.tx.toAddress)) {
          var title = gettextCatalog.getString('Add to address book?')
          var msg = gettextCatalog.getString('Do you want to add this new address to your address book?')
          popupService.showConfirm(title, msg, null, null, function (res) {
            if (res) {
              $state.transitionTo('tabs.send.addressbook', {
                addressbookEntry: $scope.tx.toAddress,
                toName: $scope.tx.toName,
                toAlias: $scope.tx.toAlias
              })
            } else {
              $state.transitionTo('tabs.home')
            }
          })
        } else {
          $state.transitionTo('tabs.home')
        }
      })
    })
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('createController',
  function ($scope, $timeout, $log, $state, $ionicScrollDelegate, $ionicHistory, profileService, gettextCatalog, ongoingProcess, popupService) {

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.formData = {}
    })

    $scope.resizeView = function () {
      $timeout(function () {
        $ionicScrollDelegate.resize()
      }, 10)
    }

    $scope.create = function () {
      var name = $scope.formData.accountName
      if (profileService.getAccountWithName(name)) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('An account already exists with that name'))
        return
      }
      ongoingProcess.set('creatingAccount', true)
      $timeout(function () {
        profileService.createAccount(name, function (err) {
          ongoingProcess.set('creatingAccount', false)
          if (err) {
            $log.warn(err)
            popupService.showAlert(gettextCatalog.getString('Error'), err)
            return
          }
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
        })
      }, 300)
    }
  })

'use strict';

angular.module('canoeApp.controllers').controller('DevLoginController', function($scope, $rootScope, $routeParams, identityService) {

  var mail = $routeParams.mail;
  var password = $routeParams.password;

  var form = {};
  form.email = {};
  form.password = {};
  form.email.$modelValue = mail;
  form.password.$modelValue = password;

  identityService.open($scope, form);

});

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('exportController',
  function ($scope, $timeout, $log, $ionicHistory, $ionicScrollDelegate, backupService, storageService, profileService, platformInfo, gettextCatalog, $state, $stateParams, popupService) {
    var wallet = profileService.getAccount($stateParams.walletId)
    $scope.wallet = wallet
    $scope.typePassword = false

    $scope.resizeView = function () {
      $timeout(function () {
        $ionicScrollDelegate.resize()
      }, 10)
    }

    $scope.checkPassword = function (pw) {
      if (profileService.checkPassword(pw)) {
        $scope.result = 'correct'
        $scope.passwordCorrect = true
      } else {
        $scope.result = 'incorrect'
        $scope.passwordCorrect = false
      }
    }

    $scope.togglePassword = function (typePasswordStr) {
      $scope[typePasswordStr] = !$scope[typePasswordStr]
    }

    $scope.generateQrCode = function () {
      if ($scope.formData.seedURI) {
        $scope.file.value = false
      }
      var seedURI = profileService.getSeedURI($scope.formData.password)
      if (!seedURI) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to generate seed QR code'))
        return
      }
      $scope.formData.seedURI = seedURI
      $scope.file.value = false
      $timeout(function () {
        $scope.$apply()
      })
    }

    var init = function () {
      $scope.formData = {}
      $scope.formData.password = ''
      $scope.passwordCorrect = false
      $scope.isCordova = platformInfo.isCordova
      $scope.isSafari = platformInfo.isSafari
      $scope.wallet = wallet
    }

    $scope.downloadWalletBackup = function () {
      $scope.getAddressbook(function (err, localAddressBook) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to export'))
          return
        }
        var opts = {
          addressBook: localAddressBook,
          password: $scope.password
        }

        backupService.walletDownload($scope.formData.password, opts, function (err) {
          if (err) {
            popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to export'))
            return
          }
          $ionicHistory.removeBackView()
          $state.go('tabs.home')
        })
      })
    }

    $scope.getAddressbook = function (cb) {
      storageService.getAddressbook(function (err, addressBook) {
        if (err) return cb(err)

        var localAddressBook = []
        try {
          localAddressBook = JSON.parse(addressBook)
        } catch (ex) {
          $log.warn(ex)
        }

        return cb(null, localAddressBook)
      })
    }

    $scope.getBackup = function (cb) {
      $scope.getAddressbook(function (err, localAddressBook) {
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to export'))
          return cb(null)
        }
        var opts = {
          addressBook: localAddressBook,
          password: $scope.formData.password
        }
        var ew = backupService.walletExport($scope.formData.password, opts)
        if (!ew) {
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Failed to export'))
        }
        return cb(ew)
      })
    }

    $scope.viewWalletBackup = function () {
      $timeout(function () {
        $scope.getBackup(function (backup) {
          var ew = backup
          if (!ew) return
          $scope.backupWalletPlainText = ew
        })
      }, 100)
    }

    $scope.copyWalletBackup = function () {
      $scope.getBackup(function (backup) {
        var ew = backup
        if (!ew) return
        window.cordova.plugins.clipboard.copy(ew)
        window.plugins.toast.showShortCenter(gettextCatalog.getString('Copied to clipboard'))
      })
    }

    $scope.sendWalletBackup = function () {
      window.plugins.toast.showShortCenter(gettextCatalog.getString('Preparing backup...'))
      $scope.getBackup(function (backup) {
        var ew = backup
        if (!ew) return
        var subject = 'BCB Wallet Backup'
        var body = 'Here is the encrypted backup of the wallet.\n\n' + ew + '\n\n To import this backup, copy all text between {...}, including the symbols {}'
        window.plugins.socialsharing.shareViaEmail(
          body,
          subject,
          null, // TO: must be null or an array
          null, // CC: must be null or an array
          null, // BCC: must be null or an array
          null, // FILES: can be null, a string, or an array
          function () {},
          function () {}
        )
      })
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      init()
      $scope.file = {
        value: true
      }
      $scope.formData.seedURI = null
      $scope.password = null
      $scope.result = null
    })
  })

'use strict'

angular.module('canoeApp.controllers').controller('completeController', function ($scope, $stateParams, $timeout, $log, $ionicHistory, $state, $ionicNavBarDelegate, $ionicConfig, platformInfo, configService, storageService, lodash, appConfigService, gettextCatalog) {
  $scope.isCordova = platformInfo.isCordova
  $scope.title = gettextCatalog.getString('Share BCB Wallet', {
    appName: appConfigService.nameCase
  })

  var defaults = configService.getDefaults()
  var downloadUrl = defaults.download.canoe.url

  function quickFeedback (cb) {
    window.plugins.spinnerDialog.show()
    $timeout(window.plugins.spinnerDialog.hide, 300)
    $timeout(cb, 20)
  }

  $scope.shareFacebook = function () {
    quickFeedback(function () {
      window.plugins.socialsharing.shareVia($scope.shareFacebookVia, null, null, null, downloadUrl)
    })
  }

  $scope.shareTwitter = function () {
    quickFeedback(function () {
      window.plugins.socialsharing.shareVia($scope.shareTwitterVia, null, null, null, downloadUrl)
    })
  }

  $scope.shareGooglePlus = function () {
    quickFeedback(function () {
      window.plugins.socialsharing.shareVia($scope.shareGooglePlusVia, downloadUrl)
    })
  }

  $scope.shareEmail = function () {
    quickFeedback(function () {
      window.plugins.socialsharing.shareViaEmail(downloadUrl)
    })
  }

  $scope.shareWhatsapp = function () {
    quickFeedback(function () {
      window.plugins.socialsharing.shareViaWhatsApp(downloadUrl)
    })
  }

  $scope.shareMessage = function () {
    quickFeedback(function () {
      window.plugins.socialsharing.shareViaSMS(downloadUrl)
    })
  }

  $scope.$on('$ionicView.beforeLeave', function () {
    $ionicConfig.views.swipeBackEnabled(true)
  })

  $scope.$on('$ionicView.enter', function () {
    if (!$scope.fromSettings)      { $ionicConfig.views.swipeBackEnabled(false)}
  })

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.score = (data.stateParams && data.stateParams.score) ? parseInt(data.stateParams.score) : null
    $scope.skipped = !!((data.stateParams && data.stateParams.skipped))
    $scope.rated = !!((data.stateParams && data.stateParams.rated))
    $scope.fromSettings = !!((data.stateParams && data.stateParams.fromSettings))

    if (!$scope.fromSettings) {
      $ionicNavBarDelegate.showBackButton(false)
    } else {
      $ionicNavBarDelegate.showBackButton(true)
    }

    storageService.getFeedbackInfo(function (error, info) {
      var feedbackInfo = lodash.isString(info) ? JSON.parse(info) : null
      feedbackInfo.sent = true
      storageService.setFeedbackInfo(JSON.stringify(feedbackInfo), function () {})
    })

    if (!$scope.isCordova) return
    $scope.animate = true

    window.plugins.socialsharing.available(function (isAvailable) {
      // the boolean is only false on iOS < 6
      $scope.socialsharing = isAvailable
      if (isAvailable) {
        window.plugins.socialsharing.canShareVia('com.apple.social.facebook', 'msg', null, null, null, function (e) {
          $scope.shareFacebookVia = 'com.apple.social.facebook'
          $scope.facebook = true
        }, function (e) {
          window.plugins.socialsharing.canShareVia('com.facebook.katana', 'msg', null, null, null, function (e) {
            $scope.shareFacebookVia = 'com.facebook.katana'
            $scope.facebook = true
          }, function (e) {
            $log.debug('facebook error: ' + e)
            $scope.facebook = false
          })
        })
        window.plugins.socialsharing.canShareVia('com.apple.social.twitter', 'msg', null, null, null, function (e) {
          $scope.shareTwitterVia = 'com.apple.social.twitter'
          $scope.twitter = true
        }, function (e) {
          window.plugins.socialsharing.canShareVia('com.twitter.android', 'msg', null, null, null, function (e) {
            $scope.shareTwitterVia = 'com.twitter.android'
            $scope.twitter = true
          }, function (e) {
            $log.debug('twitter error: ' + e)
            $scope.twitter = false
          })
        })
        window.plugins.socialsharing.canShareVia('com.google.android.apps.plus', 'msg', null, null, null, function (e) {
          $scope.shareGooglePlusVia = 'com.google.android.apps.plus'
          $scope.googleplus = true
        }, function (e) {
          $log.debug('googlePlus error: ' + e)
          $scope.googleplus = false
        })
        window.plugins.socialsharing.canShareViaEmail(function (e) {
          $scope.email = true
        }, function (e) {
          $log.debug('email error: ' + e)
          $scope.email = false
        })
        window.plugins.socialsharing.canShareVia('whatsapp', 'msg', null, null, null, function (e) {
          $scope.whatsapp = true
        }, function (e) {
          $log.debug('whatsapp error: ' + e)
          $scope.whatsapp = false
        })
      }
    }, 100)
  })

  $scope.close = function () {
    $ionicHistory.nextViewOptions({
      disableAnimate: false,
      historyRoot: true
    })
    if ($scope.score === 5) $ionicHistory.goBack(-3)
    else $ionicHistory.goBack(-2)
  }
})

'use strict'
/* global ionic angular */

angular.module('canoeApp.controllers').controller('rateAppController', function ($log, $scope, $state, $stateParams, $window, lodash, externalLinkService, configService, platformInfo, feedbackService, ongoingProcess, popupService, appConfigService) {
  $scope.score = parseInt($stateParams.score)
  $scope.appName = appConfigService.nameCase
  var isAndroid = platformInfo.isAndroid
  var isIOS = platformInfo.isIOS

  var config = configService.getSync()

  $scope.skip = function () {
    var dataSrc = {
      'Email': lodash.values(config.emailFor)[0] || ' ',
      'Feedback': ' ',
      'Score': $stateParams.score,
      'AppVersion': $window.version,
      'Platform': ionic.Platform.platform(),
      'DeviceVersion': ionic.Platform.version()
    }
    feedbackService.send(dataSrc, function (err) {
      if (err) {
        // try to send, but not essential, since the user didn't add a message
        $log.warn('Could not send feedback.')
      }
    })
    $state.go('tabs.rate.complete', {
      score: $stateParams.score,
      skipped: true
    })
  }

  $scope.sendFeedback = function () {
    $state.go('tabs.rate.send', {
      score: $scope.score
    })
  }

  $scope.goAppStore = function () {
    var defaults = configService.getDefaults()
    var url
    if (isAndroid) { url = defaults.rateApp.canoe.android }
    if (isIOS) { url = defaults.rateApp.canoe.ios }

    externalLinkService.open(url)
    $state.go('tabs.rate.complete', {
      score: $stateParams.score,
      skipped: true,
      rated: true
    })
  }
})

'use strict'
/* global angular */

angular.module('canoeApp.controllers').controller('rateCardController', function ($scope, $state, $timeout, $log, gettextCatalog, platformInfo, storageService, appConfigService) {
  $scope.isCordova = platformInfo.isCordova
  $scope.score = 0
  $scope.appName = appConfigService.nameCase

  $scope.goFeedbackFlow = function () {
    $scope.hideCard()
    if ($scope.isCordova && $scope.score === 5) {
      $state.go('tabs.rate.rateApp', {
        score: $scope.score
      })
    } else {
      $state.go('tabs.rate.send', {
        score: $scope.score
      })
    }
  }

  $scope.setScore = function (score) {
    $scope.score = score
    switch ($scope.score) {
      case 1:
        $scope.button_title = gettextCatalog.getString('I think this app is terrible.')
        break
      case 2:
        $scope.button_title = gettextCatalog.getString("I don't like it")
        break
      case 3:
        $scope.button_title = gettextCatalog.getString("Meh - it's alright")
        break
      case 4:
        $scope.button_title = gettextCatalog.getString('I like the app')
        break
      case 5:
        $scope.button_title = gettextCatalog.getString('This app is fantastic!')
        break
    }
    $timeout(function () {
      $scope.$apply()
    })
  }

  $scope.hideCard = function () {
    $log.debug('Feedback card dismissed.')
    storageService.getFeedbackInfo(function (error, info) {
      if (error) { $log.error(error) }
      var feedbackInfo = JSON.parse(info)
      feedbackInfo.sent = true
      storageService.setFeedbackInfo(JSON.stringify(feedbackInfo), function () {
        $scope.showRateCard.value = false
        $timeout(function () {
          $scope.$apply()
        }, 100)
      })
    })
  }
})

'use strict'
/* global angular ionic */
angular.module('canoeApp.controllers').controller('sendController', function ($scope, $state, $log, $timeout, $stateParams, $ionicNavBarDelegate, $ionicHistory, $ionicConfig, $window, gettextCatalog, popupService, configService, lodash, feedbackService, ongoingProcess, platformInfo, appConfigService) {
  $scope.sendFeedback = function (feedback, goHome) {
    var config = configService.getSync()

    var dataSrc = {
      'Email': lodash.values(config.emailFor)[0] || ' ',
      'Feedback': goHome ? ' ' : feedback,
      'Score': $stateParams.score || ' ',
      'AppVersion': $window.version,
      'Platform': ionic.Platform.platform(),
      'DeviceVersion': ionic.Platform.version()
    }

    if (!goHome) ongoingProcess.set('sendingFeedback', true)
    feedbackService.send(dataSrc, function (err) {
      if (goHome) return
      ongoingProcess.set('sendingFeedback', false)
      if (err) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Feedback could not be submitted. Please try again later.'))
        return
      }
      if (!$stateParams.score) {
        popupService.showAlert(gettextCatalog.getString('Thank you!'), gettextCatalog.getString('A member of the team will review your feedback as soon as possible.'), function () {
          $scope.feedback.value = ''
          $ionicHistory.nextViewOptions({
            disableAnimate: false,
            historyRoot: true
          })
          $ionicHistory.goBack()
        }, gettextCatalog.getString('Finish'))
        return
      }
      $state.go('tabs.rate.complete', {
        score: $stateParams.score
      })
    })
    if (goHome) $state.go('tabs.home')
  }

  $scope.$on('$ionicView.beforeLeave', function (event, data) {
    $ionicConfig.views.swipeBackEnabled(true)
  })

  $scope.$on('$ionicView.enter', function (event, data) {
    if ($scope.score) {
      $ionicConfig.views.swipeBackEnabled(false)
    }
  })

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.isCordova = platformInfo.isCordova
    $scope.score = (data.stateParams && data.stateParams.score) ? parseInt(data.stateParams.score) : null
    $scope.feedback = {}

    switch ($scope.score) {
      case 1:
        $scope.reaction = 'Ouch!'
        $scope.comment = gettextCatalog.getString("There's obviously something we're doing wrong.") + ' ' + gettextCatalog.getString('How could we improve your experience?')
        break
      case 2:
        $scope.reaction = gettextCatalog.getString('Oh no!')
        $scope.comment = gettextCatalog.getString("There's obviously something we're doing wrong.") + ' ' + gettextCatalog.getString('How could we improve your experience?')
        break
      case 3:
        $scope.reaction = 'Hmm...'
        $scope.comment = gettextCatalog.getString("We'd love to do better.") + ' ' + gettextCatalog.getString('How could we improve your experience?')
        break
      case 4:
        $scope.reaction = gettextCatalog.getString('Thanks!')
        $scope.comment = gettextCatalog.getString("That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?")
        break
      case 5:
        $scope.reaction = gettextCatalog.getString('Thank you!')
        $scope.comment = gettextCatalog.getString("We're always looking for ways to improve BCB wallet.", {
          appName: appConfigService.nameCase
        }) + ' ' + gettextCatalog.getString('Is there anything we could do better?')
        break
      default:
        $scope.justFeedback = true
        $scope.comment = gettextCatalog.getString("We're always looking for ways to improve BCB wallet. How could we improve your experience?", {
          appName: appConfigService.nameCase
        })
        break
    }
  })

  $scope.$on('$ionicView.afterEnter', function () {
    $scope.showForm = true
  })

  $scope.goBack = function () {
    $ionicHistory.nextViewOptions({
      disableAnimate: false,
      historyRoot: true
    })
    $ionicHistory.goBack()
  }
})

'use strict';

angular.module('canoeApp.controllers').controller('headController', function($scope, appConfigService, $log) {
  $scope.appConfig = appConfigService;
  $log.info('Running head controller:' + appConfigService.nameCase)
});

'use strict';

angular.module('canoeApp.controllers').controller('homeIntegrationsController', function($scope, homeIntegrationsService, $ionicScrollDelegate, $timeout) {

  $scope.hide = false;
  $scope.services = homeIntegrationsService.get();

  $scope.toggle = function() {
    $scope.hide = !$scope.hide;
    $timeout(function() {
      $ionicScrollDelegate.resize();
      $scope.$apply();
    }, 10);
  };

});

'use strict'
/* global angular FileReader */
angular.module('canoeApp.controllers').controller('importController',
  function ($scope, $timeout, $log, $state, $stateParams, $ionicHistory, $ionicScrollDelegate, profileService, configService, nanoService, platformInfo, ongoingProcess, popupService, gettextCatalog) {
    var reader = new FileReader()

    $scope.init = function () {
      $scope.isCordova = platformInfo.isCordova
      $scope.formData = {}
      $scope.formData.account = 1
      $scope.importErr = false

      if ($stateParams.code) { $scope.processQRSeed($stateParams.code) }

      $scope.seedOptions = []
      $scope.fromOnboarding = $stateParams.fromOnboarding

      $timeout(function () {
        $scope.$apply()
      })
    }

    $scope.togglePassword = function (typePasswordStr) {
      $scope[typePasswordStr] = !$scope[typePasswordStr]
    }

    $scope.processQRSeed = function (data) {
      // xrbseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
      // xrbseed:97123971239712937123987129387129873?label=bah&message=hubba&lastindex=9
      if (!data) return

      nanoService.parseQRCode(data, function (err, code) {
        if (err) {
          // Trying to import a malformed seed QR code
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Incorrect code format for a seed: ' + err))
          return
        }
        if (code.protocol === 'xrbseed' || code.protocol === 'nanoseed') {
          $timeout(function () {
            $scope.formData.seed = code.seed
            $scope.$apply()
          }, 1)
        } else {
          // Trying to import wrong protocol
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Not a seed QR code: ' + data))
        }
      })
    }

    var _importBlob = function (data, opts) {
      function importWallet () {
        ongoingProcess.set('importingWallet', true)
        $timeout(function () {
          try {
            profileService.importWallet(data, $scope.formData.password, function (err) {
              ongoingProcess.set('importingWallet', false)
              if (err) {
                popupService.showAlert(gettextCatalog.getString('Error'), 'Error importing wallet, check that the password was correct')
                return
              }
              finish()
            })
          } catch (e) {
            $log.error(gettextCatalog.getString('Error importing wallet: ' + e))
            popupService.showAlert(gettextCatalog.getString('Error'), 'Error importing wallet: ' + e)
          }
        }, 100)
      }
      if (!$stateParams.fromOnboarding) {
        importWarning(importWallet)
      } else {
        importWallet()
      }
    }

    $scope.getFile = function () {
      // If we use onloadend, we need to check the readyState.
      reader.onloadend = function (evt) {
        if (evt.target.readyState === FileReader.DONE) { // DONE == 2
          _importBlob(evt.target.result)
        }
      }
    }

    $scope.importBlob = function (form) {
      if (form.$invalid) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('There is an error in the form'))
        return
      }

      var backupFile = $scope.formData.file
      var backupText = $scope.formData.backupText

      if (!backupFile && !backupText) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please, select your backup file'))
        return
      }

      if (backupFile) {
        reader.readAsBinaryString(backupFile)
      } else {
        _importBlob(backupText)
      }
    }

    $scope.importSeed = function (form) {
      if (form.$invalid) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('There is an error in the form'))
        return
      }
      var seed = $scope.formData.seed || null
      if (!seed) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please enter the seed'))
        return
      }
      if (!nanoService.isValidSeed(seed)) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('The seed is invalid, it should be 64 characters of: 0-9, A-F'))
        return
      }
      var password = $scope.formData.password || null
      if (!password) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please enter a password to use for the wallet'))
        return
      } else if (password.length < 8) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Please enter a password of at least 8 characters'))
        return
      }

      function importSeed () {
        ongoingProcess.set('importingWallet', true)
        $timeout(function () {
          $log.debug('Importing Wallet Seed')
          profileService.createWallet(password, seed, function (err) {
            ongoingProcess.set('importingWallet', false)
            if (err) {
              popupService.showAlert(gettextCatalog.getString('Error'), 'Error importing seed, check session log for more details')
              return
            }
            finish()
          })
        }, 100)
      }

      if (!$stateParams.fromOnboarding) {
        importWarning(importSeed)
      } else {
        importSeed()
      }
    }

    var importWarning = function (cb) {
      var title = gettextCatalog.getString('Warning!')
      var deleteWord = gettextCatalog.getString('delete')
      var message = gettextCatalog.getString('Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. To confirm you wish to delete your current wallet type:') + deleteWord

      popupService.showPrompt(title, message, null, function (res) {
        if (!res || res.toLowerCase() !== deleteWord.toLowerCase()) return
        return cb()
      })
    }

    var finish = function () {
      profileService.setBackupFlag()
      if ($stateParams.fromOnboarding) {
        profileService.setDisclaimerAccepted(function (err) {
          if (err) $log.error(err)
        })
      }
      $ionicHistory.removeBackView()
      $state.go('tabs.home', {
        fromOnboarding: $stateParams.fromOnboarding
      })
    }

    $scope.resizeView = function () {
      $timeout(function () {
        $ionicScrollDelegate.resize()
      }, 10)
    }

    $scope.$on('$ionicView.afterEnter', function (event, data) {
      $scope.showAdv = false
      $scope.init()
    })
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('confirmationController', function ($scope) {
  $scope.ok = function () {
    $scope.loading = true
    $scope.okAction()
    $scope.confirmationModal.hide()
  }

  $scope.cancel = function () {
    $scope.confirmationModal.hide()
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('passwordController', function ($state, $interval, $stateParams, $ionicHistory, $timeout, $scope, $log, configService, profileService, gettextCatalog, popupService, ongoingProcess, soundService, applicationService) {
  var ATTEMPT_LIMIT = 5
  var ATTEMPT_LOCK_OUT_TIME = 5 * 60
  var currentPassword = ''

  $scope.match = $scope.error = $scope.disableButton = false
  $scope.currentAttempts = 0
  $scope.password = ''

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.password = ''
  })

  configService.whenAvailable(function (config) {
    if (!config.lock) return
    $scope.bannedUntil = config.lock.bannedUntil || null
    if ($scope.bannedUntil) {
      var now = Math.floor(Date.now() / 1000)
      if (now < $scope.bannedUntil) {
        $scope.error = $scope.disableButton = true
        lockTimeControl($scope.bannedUntil)
      }
    }
  })

  function checkAttempts () {
    $scope.currentAttempts += 1
    $log.debug('Attempts to unlock:', $scope.currentAttempts)
    if ($scope.currentAttempts === ATTEMPT_LIMIT) {
      $scope.currentAttempts = 0
      var bannedUntil = Math.floor(Date.now() / 1000) + ATTEMPT_LOCK_OUT_TIME
      saveFailedAttempt(bannedUntil)
    }
  }

  $scope.togglePassword = function () {
    $scope.typePassword = !$scope.typePassword
  }

  function lockTimeControl (bannedUntil) {
    setExpirationTime()

    var countDown = $interval(function () {
      setExpirationTime()
    }, 1000)

    function setExpirationTime () {
      var now = Math.floor(Date.now() / 1000)
      if (now > bannedUntil) {
        if (countDown) reset()
      } else {
        $scope.disableButton = true
        var totalSecs = bannedUntil - now
        var m = Math.floor(totalSecs / 60)
        var s = totalSecs % 60
        $scope.expires = ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2)
      }
    }

    function reset () {
      $scope.expires = $scope.error = $scope.disableButton = null
      currentPassword = ''
      $interval.cancel(countDown)
      $timeout(function () {
        $scope.$apply()
      })
    }
  }

  $scope.gotoOnboarding = function () {
    var title = gettextCatalog.getString('Warning!')
    var message = gettextCatalog.getString('Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type "delete" to confirm you wish to delete your current wallet.')
    popupService.showPrompt(title, message, null, function (res) {
      if (!res || res.toLowerCase() !== gettextCatalog.getString('delete').toLowerCase()) return
      $scope.hideModal()
      // Go to import seed
      $ionicHistory.nextViewOptions({
        disableAnimate: true,
        historyRoot: true
      })
      $state.go('onboarding.welcome')
    })
  }

  $scope.unlock = function (value) {
    if ($scope.disableButton) return // Should not happen
    $scope.error = false
    currentPassword = value
    ongoingProcess.set('decryptingWallet', true)
    profileService.enteredPassword(currentPassword)
    // Now we try to load wallet and if it fails, ask user again
    profileService.loadWallet(function (err) {
      ongoingProcess.set('decryptingWallet', false)
      if (profileService.getWallet()) {
        $scope.hideModal()
        soundService.play('unlocking')
        if (err) {
          // Some other error though, we need to show it
          popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Error after loading wallet: ' + err))
        }
      } else {
        $scope.password = ''
        showError()
        checkAttempts()
      }
    })
  }

  function showError () {
    $timeout(function () {
      currentPassword = ''
      $scope.error = true
    }, 200)
    $timeout(function () {
      $scope.$apply()
    })
  }

  function saveFailedAttempt (bannedUntil) {
    var opts = {
      lock: {
        bannedUntil: bannedUntil
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      lockTimeControl(bannedUntil)
    })
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('pinController', function ($state, $interval, $stateParams, $ionicHistory, $timeout, $scope, $log, configService, appConfigService, applicationService) {
  var ATTEMPT_LIMIT = 3
  var ATTEMPT_LOCK_OUT_TIME = 5 * 60
  var currentPin
  currentPin = $scope.confirmPin = ''

  $scope.match = $scope.error = $scope.disableButtons = false
  $scope.currentAttempts = 0
  $scope.appName = appConfigService.name

  configService.whenAvailable(function (config) {
    if (!config.lock) return
    $scope.bannedUntil = config.lock.bannedUntil || null
    if ($scope.bannedUntil) {
      var now = Math.floor(Date.now() / 1000)
      if (now < $scope.bannedUntil) {
        $scope.error = $scope.disableButtons = true
        lockTimeControl($scope.bannedUntil)
      }
    }
  })

  function checkAttempts () {
    $scope.currentAttempts += 1
    $log.debug('Attempts to unlock:', $scope.currentAttempts)
    if ($scope.currentAttempts === ATTEMPT_LIMIT) {
      $scope.currentAttempts = 0
      var bannedUntil = Math.floor(Date.now() / 1000) + ATTEMPT_LOCK_OUT_TIME
      saveFailedAttempt(bannedUntil)
    }
  }

  function lockTimeControl (bannedUntil) {
    setExpirationTime()

    var countDown = $interval(function () {
      setExpirationTime()
    }, 1000)

    function setExpirationTime () {
      var now = Math.floor(Date.now() / 1000)
      if (now > bannedUntil) {
        if (countDown) reset()
      } else {
        $scope.disableButtons = true
        var totalSecs = bannedUntil - now
        var m = Math.floor(totalSecs / 60)
        var s = totalSecs % 60
        $scope.expires = ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2)
      }
    }

    function reset () {
      $scope.expires = $scope.error = $scope.disableButtons = null
      currentPin = $scope.confirmPin = ''
      $interval.cancel(countDown)
      $timeout(function () {
        $scope.$apply()
      })
    }
  }

  $scope.getFilledClass = function (limit) {
    return currentPin.length >= limit ? 'filled-' + $scope.appName : null
  }

  $scope.delete = function () {
    if ($scope.disableButtons) return
    if (currentPin.length > 0) {
      currentPin = currentPin.substring(0, currentPin.length - 1)
      $scope.error = false
      $scope.updatePin()
    }
  }

  $scope.isComplete = function () {
    if (currentPin.length < 4) return false
    else return true
  }

  $scope.updatePin = function (value) {
    if ($scope.disableButtons) return
    $scope.error = false
    if (value && !$scope.isComplete()) {
      currentPin = currentPin + value
      $timeout(function () {
        $scope.$apply()
      })
    }
    $scope.save()
  }

  function isMatch (pin) {
    var config = configService.getSync()
    return config.lock.value === pin
  }

  $scope.save = function () {
    if (!$scope.isComplete()) return

    switch ($scope.action) {
      case 'setup':
        applyAndCheckPin()
        break
      case 'disable':
        if (isMatch(currentPin)) {
          deletePin()
        } else {
          showError()
          checkAttempts()
        }
        break
      case 'check':
        if (isMatch(currentPin)) {
          $scope.hideModal()
          return
        }
        showError()
        checkAttempts()
        break
    }
  }

  function showError () {
    $timeout(function () {
      $scope.confirmPin = currentPin = ''
      $scope.error = true
    }, 200)

    $timeout(function () {
      $scope.$apply()
    })
  }

  function applyAndCheckPin () {
    if (!$scope.confirmPin) {
      $timeout(function () {
        $scope.confirmPin = currentPin
        currentPin = ''
      }, 200)
    } else {
      if ($scope.confirmPin === currentPin) { savePin($scope.confirmPin) } else {
        $scope.confirmPin = currentPin = ''
        $scope.error = true
      }
    }
    $timeout(function () {
      $scope.$apply()
    })
  }

  function deletePin () {
    var opts = {
      lock: {
        value: null,
        bannedUntil: null
      }
    }

    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      $scope.hideModal()
    })
  };

  function savePin (value) {
    var opts = {
      lock: {
        value: value,
        bannedUntil: null
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      $scope.hideModal()
    })
  }

  function saveFailedAttempt (bannedUntil) {
    var opts = {
      lock: {
        bannedUntil: bannedUntil
      }
    }

    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      lockTimeControl(bannedUntil)
    })
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('searchController', function ($scope, $timeout, $ionicScrollDelegate, lodash, gettextCatalog, platformInfo) {
  var HISTORY_SHOW_LIMIT = 10
  var currentTxHistoryPage = 0
  var isCordova = platformInfo.isCordova

  $scope.updateSearchInput = function (search) {
    if (isCordova) {
      window.plugins.toast.hide()
    }
    currentTxHistoryPage = 0
    throttleSearch(search)
    $timeout(function () {
      $ionicScrollDelegate.resize()
    }, 10)
  }

  var throttleSearch = lodash.throttle(function (search) {
    function filter (search) {
      $scope.filteredTxHistory = []

      function computeSearchableString (tx) {
        var addrbook = ''
        if (tx.destination && $scope.addressbook && $scope.addressbook[tx.destination]) {
          addrbook = $scope.addressbook[tx.destination].name || $scope.addressbook[tx.destination] || ''
        }
        var searchableDate = computeSearchableDate(new Date(tx.time * 1000))
        var note = tx.note || ''
        var destination = tx.destination || ''
        var txid = tx.txid || ''
        return ((tx.amountStr + destination + addrbook + searchableDate + note + txid).toString()).toLowerCase()
      }

      function computeSearchableDate (date) {
        var day = ('0' + date.getDate()).slice(-2).toString()
        var month = ('0' + (date.getMonth() + 1)).slice(-2).toString()
        var year = date.getFullYear()
        return [month, day, year].join('/')
      }

      if (lodash.isEmpty(search)) {
        $scope.txHistoryShowMore = false
        return []
      }

      $scope.filteredTxHistory = lodash.filter($scope.completeTxHistory, function (tx) {
        if (!tx.searcheableString) tx.searcheableString = computeSearchableString(tx)
        return lodash.includes(tx.searcheableString, search.toLowerCase())
      })

      if ($scope.filteredTxHistory.length > HISTORY_SHOW_LIMIT) $scope.txHistoryShowMore = true
      else $scope.txHistoryShowMore = false
      return $scope.filteredTxHistory
    }

    $scope.txHistorySearchResults = filter(search).slice(0, HISTORY_SHOW_LIMIT)

    if (isCordova) {
      window.plugins.toast.showShortBottom(gettextCatalog.getString('Matches: ' + $scope.filteredTxHistory.length))
    }

    $timeout(function () {
      $scope.$apply()
    })
  }, 1000)

  $scope.moreSearchResults = function () {
    currentTxHistoryPage++
    $scope.showHistory()
    $scope.$broadcast('scroll.infiniteScrollComplete')
  }

  $scope.showHistory = function () {
    $scope.txHistorySearchResults = $scope.filteredTxHistory ? $scope.filteredTxHistory.slice(0, (currentTxHistoryPage + 1) * HISTORY_SHOW_LIMIT) : []
    $scope.txHistoryShowMore = $scope.filteredTxHistory.length > $scope.txHistorySearchResults.length
  }
})

'use strict';

angular.module('canoeApp.controllers').controller('txStatusController', function($scope, $timeout) {

  if ($scope.cb) $timeout($scope.cb, 100);

  $scope.cancel = function() {
    $scope.txStatusModal.hide();
  };

});

'use strict'

angular.module('canoeApp.controllers').controller('backupRequestController', function ($scope, $state, $stateParams, $ionicConfig, popupService, gettextCatalog) {
  $scope.accountId = $stateParams.walletId

  $scope.$on('$ionicView.enter', function () {
    $ionicConfig.views.swipeBackEnabled(false)
  })

  $scope.$on('$ionicView.beforeLeave', function () {
    $ionicConfig.views.swipeBackEnabled(true)
  })

  $scope.openPopup = function () {
    var title = gettextCatalog.getString('Watch out!')
    var message = gettextCatalog.getString('If this device is replaced or this app is deleted, your funds can not be recovered without a backup.')
    var okText = gettextCatalog.getString('I understand')
    var cancelText = gettextCatalog.getString('Go back')
    popupService.showConfirm(title, message, okText, cancelText, function (val) {
      if (val) {
        var title = gettextCatalog.getString('Are you sure you want to skip it?')
        var message = gettextCatalog.getString('You can create a backup later from your wallet settings.')
        var okText = gettextCatalog.getString('Yes, skip')
        var cancelText = gettextCatalog.getString('Go back')
        popupService.showConfirm(title, message, okText, cancelText, function (val) {
          if (val) {
            $state.go('onboarding.disclaimer', {
              walletId: $scope.accountId,
              backedUp: false
            })
          }
        })
      }
    })
  }
})

'use strict'

angular.module('canoeApp.controllers').controller('backupWarningController', function ($scope, $state, $timeout, $stateParams, $ionicModal) {
  $scope.accountId = $stateParams.walletId
  $scope.fromState = $stateParams.from == 'onboarding' ? $stateParams.from + '.backupRequest' : $stateParams.from
  $scope.toState = $stateParams.from + '.backup'

  $scope.openPopup = function () {
    $ionicModal.fromTemplateUrl('views/includes/screenshotWarningModal.html', {
      scope: $scope,
      backdropClickToClose: true,
      hardwareBackButtonClose: true
    }).then(function (modal) {
      $scope.warningModal = modal
      $scope.warningModal.show()
    })

    $scope.close = function () {
      $scope.warningModal.remove()
      $timeout(function () {
        $state.go($scope.toState, {
          walletId: $scope.accountId
        })
      }, 200)
    }
  }

  $scope.goBack = function () {
    $state.go($scope.fromState, {
      walletId: $scope.accountId
    })
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('createAliasController',
  function ($scope, $timeout, $log, $state, $stateParams, profileService, nanoService, aliasService, ongoingProcess) {
    var letterRegex = XRegExp('^\\p{Ll}+$')
    var lnRegex = XRegExp('^(\\p{Ll}|\\pN)+$')
    $scope.accountId = $stateParams.walletId
    $scope.emailValid = false
    $scope.aliasValid = false
    $scope.aliasRegistered = null
    $scope.checkingAlias = false
    $scope.validateAlias = function (alias) {
      $scope.aliasRegistered = null
      if (alias && alias.length > 0 && alias.charAt(0) === '@') {
        alias = alias.substring(1, alias.length)
      }
      $scope.aliasValid = alias.length >= 3 && letterRegex.test(alias.charAt(0)) && lnRegex.test(alias)
      $scope.checkingAlias = true
      if ($scope.aliasValid === true) {
        aliasService.lookupAlias(alias, function (err, alias) {
          if (err === null) {
            $scope.aliasRegistered = true
          } else if (err === 'Could not find alias') {
            $scope.aliasRegistered = false
          } else {
            $scope.aliasRegistered = true
          }
          $scope.checkingAlias = false
          $scope.$apply()
        })
      } else {
        $scope.checkingAlias = false
      }
    }
    $scope.validateEmail = function (email) {
      $scope.emailValid = validator.isEmail(email)
    };
    $scope.create = function (alias, email, isPrivate, createPhoneAlias) {
      // Save the alias we have selected to use for our wallet
      var account = $scope.wallet.getCurrentAccount()
      if (alias && alias.length > 0 && alias.charAt(0) === '@') {
        alias = alias.substring(1, alias.length)
      }
      var data = $scope.wallet.aliasSignature([alias, account])
      ongoingProcess.set('creatingAlias', true)
      aliasService.createAlias(alias, account, email, isPrivate, data.signature, function (err, ans) {
        if (err) {
          ongoingProcess.set('creatingAlias', false)
          return $log.debug(err)
        }
        $log.debug('Answer from alias server creation: ' + JSON.stringify(ans))
        if (ans) {
          var meta = $scope.wallet.getMeta(account)
          ans.alias.email = email
          meta.alias = ans.alias
          $scope.wallet.setMeta(account, meta)
          nanoService.saveWallet($scope.wallet, function (err, wallet) {
            profileService.setWallet($scope.wallet, function (err) {
              if (err) $log.debug(err)
              $log.info('Finished Creating and storing your alias')
              $state.go('onboarding.backupRequest', {
                walletId: $scope.accountId
              })
            })
          })
        }
        ongoingProcess.set('creatingAlias', false)
      })
    }

    $scope.skipAlias = function () {
      $state.go('onboarding.backupRequest', {
        walletId: $scope.accountId
      })
    }

    $scope.$on('$ionicView.enter', function (event, data) {
      $scope.wallet = profileService.getWallet();
      if ($scope.wallet === null) {
        $log.debug('Bad password or no wallet')
        
      }
    })
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('disclaimerController', function ($scope, $timeout, $state, $log, $ionicModal, $ionicConfig, profileService, uxLanguage, externalLinkService, storageService, $stateParams, startupService, $rootScope) {
  $scope.$on('$ionicView.afterEnter', function () {
    startupService.ready()
  })

  $scope.$on('$ionicView.beforeEnter', function () {
    $scope.lang = uxLanguage.currentLanguage
    $scope.terms = {}
    $scope.accepted = {}
    $scope.accepted.first = $scope.accepted.second = $scope.accepted.third = false
    $scope.backedUp = $stateParams.backedUp !== 'false'
    $scope.resume = $stateParams.resume || false
    $scope.shrinkView = false
  })

  $scope.$on('$ionicView.enter', function () {
    if ($scope.backedUp || $scope.resume) $ionicConfig.views.swipeBackEnabled(false)
  })

  $scope.$on('$ionicView.beforeLeave', function () {
    $ionicConfig.views.swipeBackEnabled(true)
  })

  $scope.confirm = function () {
    profileService.setDisclaimerAccepted(function (err) {
      if (err) $log.error(err)
      else {
        $state.go('tabs.home', {
          fromOnboarding: true
        })
      }
    })
  }

  $scope.openExternalLink = function (url, target) {
    externalLinkService.open(url, target)
  }

  $scope.openTerms = function () {
    $scope.shrinkView = !$scope.shrinkView
  }

  $scope.goBack = function () {
    $state.go('onboarding.backupRequest', {
      walletId: $stateParams.walletId
    })
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('termsController', function ($scope, $log, $state, appConfigService, uxLanguage, profileService, externalLinkService, gettextCatalog) {
  $scope.lang = uxLanguage.currentLanguage

  $scope.confirm = function () {
    profileService.setDisclaimerAccepted(function (err) {
      if (err) $log.error(err)
      else {
        $state.go('tabs.home', {
          fromOnboarding: true
        })
      }
    })
  }

  $scope.openExternalLink = function () {
    var url = appConfigService.disclaimerUrl
    var optIn = true
    var title = gettextCatalog.getString('View Terms of Service')
    var message = gettextCatalog.getString('The official English Terms of Service are available on the BCB wallet website.')
    var okText = gettextCatalog.getString('Open Website')
    var cancelText = gettextCatalog.getString('Go Back')
    externalLinkService.open(url, optIn, title, message, okText, cancelText)
  }
})

'use strict'
/* global angular */
angular
  .module('canoeApp.controllers')
  .controller('tourController', function (
    $scope,
    $state,
    $log,
    $timeout,
    $filter,
    ongoingProcess,
    profileService,
    popupService,
    gettextCatalog
  ) {
    $scope.data = {
      index: 0
    }

    $scope.options = {
      loop: false,
      effect: 'slide',
      speed: 500,
      spaceBetween: 100,
      noSwiping: true,
      noSwipingClass: 'no-swipe'
    }

    $scope.$on('$ionicSlides.sliderInitialized', function (event, data) {
      $scope.slider = data.slider
    })

    $scope.$on('$ionicSlides.slideChangeStart', function (event, data) {
      $scope.data.index = data.slider.activeIndex
    })

    $scope.goBack = function () {
      if ($scope.data.index !== 0) {
        $scope.slider.slidePrev()
      } else $state.go('onboarding.welcome')
    }

    $scope.slideNext = function () {
      if ($scope.data.index !== 3) {
        $scope.slider.slideNext()
      } else $state.go('onboarding.welcome')
    }

    $scope.changeSlide = function (slideIndex, speed) {
      if ($scope.data.index !== 3) $scope.slider.slideTo(slideIndex, speed)
    }

    $scope.togglePassword = function () {
      $scope.typePassword = !$scope.typePassword
    }

    $scope.validate = function () {
    }

    var retryCount = 0
    $scope.createDefaultWallet = function (password) {
      // Set the password we have selected to use for our wallet
      profileService.enteredPassword(password)
      ongoingProcess.set('creatingWallet', true)
      $timeout(function () {
        // This is the call to create the wallet from onboarding
        profileService.createWallet(
          profileService.getEnteredPassword(),
          null,
          function (err, wallet) {
            if (err) {
              $log.warn(err)
              return $timeout(function () {
                $log.warn(
                  'Retrying to create default wallet.....:' + ++retryCount
                )
                if (retryCount > 3) {
                  ongoingProcess.set('creatingWallet', false)
                  popupService.showAlert(
                    gettextCatalog.getString('Cannot Create Wallet'),
                    err,
                    function () {
                      retryCount = 0
                      return $scope.createDefaultWallet()
                    },
                    gettextCatalog.getString('Retry')
                  )
                } else {
                  return $scope.createDefaultWallet()
                }
              }, 2000)
            }
            ongoingProcess.set('creatingWallet', false)
            $state.go('onboarding.backupRequest', {
              walletId: $scope.accountId
            })
          }
        )
      }, 300)
    }
  })

'use strict'

angular.module('canoeApp.controllers').controller('welcomeController', function ($scope, $state, $timeout, $ionicConfig, $log, profileService, startupService, storageService) {
  $scope.$on('$ionicView.afterEnter', function () {
    startupService.ready()
  })

  $scope.$on('$ionicView.enter', function () {
    $ionicConfig.views.swipeBackEnabled(false)
  })

  $scope.$on('$ionicView.beforeLeave', function () {
    $ionicConfig.views.swipeBackEnabled(true)
  })

  $scope.createProfile = function () {
    $log.debug('Creating profile')
    profileService.createProfile(function (err) {
      if (err) $log.warn(err)
    })
  }
})

/* global angular */
angular.module('canoeApp.controllers').controller('paperWalletController',
  function ($scope, $timeout, $log, popupService, gettextCatalog, profileService, $state, ongoingProcess, txFormatService, $stateParams) {
    function _scanFunds (cb) {
      // Do it here
    }

    $scope.scanFunds = function () {
      ongoingProcess.set('scanning', true)
      $timeout(function () {
        _scanFunds(function (err, privateKey, balance) {
          ongoingProcess.set('scanning', false)
          if (err) {
            $log.error(err)
            popupService.showAlert(gettextCatalog.getString('Error scanning funds:'), err || err.toString())
            $state.go('tabs.home')
          } else {
            $scope.privateKey = privateKey
            $scope.balanceSat = balance
            if ($scope.balanceSat <= 0) {
              popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Not funds found'))
            }
            $scope.balance = txFormatService.formatAmountStr($scope.account.coin, balance)
          }
          $scope.$apply()
        })
      }, 100)
    }

    function _sweepWallet (cb) {
       
    }

    $scope.sweepWallet = function () {
      ongoingProcess.set('sweepingWallet', true)
      $scope.sending = true

      $timeout(function () {
        _sweepWallet(function (err, destinationAddress, txid) {
          ongoingProcess.set('sweepingWallet', false)
          $scope.sending = false
          if (err) {
            $log.error(err)
            popupService.showAlert(gettextCatalog.getString('Error sweeping wallet:'), err || err.toString())
          } else {
            $scope.sendStatus = 'success'
          }
          $scope.$apply()
        })
      }, 100)
    }

    $scope.onSuccessConfirm = function () {
      $state.go('tabs.home')
    }

    $scope.onAccountSelect = function (wallet) {
      $scope.account = wallet
    }

    $scope.showAccountSelector = function () {
      if ($scope.singleAccount) return
      $scope.accountSelectorTitle = gettextCatalog.getString('Transfer to')
      $scope.showAccounts = true
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.scannedKey = (data.stateParams && data.stateParams.privateKey) ? data.stateParams.privateKey : null
      $scope.isPkEncrypted = $scope.scannedKey ? ($scope.scannedKey.substring(0, 2) == '6P') : null
      $scope.sendStatus = null
      $scope.error = false

      $scope.accounts = profileService.getAccounts()
      $scope.singleAccount = $scope.accounts.length === 1

      if (!$scope.accounts || !$scope.accounts.length) {
        $scope.noMatchingWallet = true       
      }
    })

    $scope.$on('$ionicView.enter', function (event, data) {
      $scope.account = $scope.accounts[0]
      if (!$scope.account) return
      if (!$scope.isPkEncrypted) $scope.scanFunds()
      else {
        var message = gettextCatalog.getString('Private key encrypted. Enter password')
        popupService.showPrompt(null, message, null, function (res) {
          $scope.passphrase = res
          $scope.scanFunds()
        })
      }
    })
  })

'use strict'
angular.module('canoeApp.controllers').controller('paymentUriController',
  function ($rootScope, $scope, $stateParams, $location, $timeout, $ionicHistory, profileService, configService, lodash, $state) {
    function strip (number) {
      return (parseFloat(number.toPrecision(12)))
    };

    // Build bitcoinURI with querystring
    this.init = function () {
      var query = []
      this.bitcoinURI = $stateParams.url

      //var URI = bitcore.URI
      var isUriValid = URI.isValid(this.bitcoinURI)
      if (!URI.isValid(this.bitcoinURI)) {
        this.error = true
        return
      }
      var uri = new URI(this.bitcoinURI)

      if (uri && uri.address) {
        var config = configService.getSync().wallet.settings
        var unitToRaw = config.unitToRaw
        var rawToUnit = 1 / unitToRaw
        var unitName = config.unitName

        if (uri.amount) {
          uri.amount = strip(uri.amount * rawToUnit) + ' ' + unitName
        }
        uri.network = uri.address.network.name
        this.uri = uri
      }
    }

    this.getAccounts = function (network) {
      $scope.accounts = []
      lodash.forEach(profileService.getAccounts(network), function (w) {
        var client = profileService.getClient(w.id)
        profileService.isReady(client, function (err) {
          if (err) return
          $scope.accounts.push(w)
        })
      })
    }

    this.selectWallet = function (wid) {
      var self = this
      profileService.setAndStoreFocus(wid, function () {})
      $ionicHistory.removeBackView()
      $state.go('tabs.home')
      $timeout(function () {
        $rootScope.$emit('paymentUri', self.bitcoinURI)
      }, 1000)
    }
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesController',
  function ($scope, $log, $ionicHistory, configService, profileService, fingerprintService, platformInfo) {
    var account
    var accountId

    $scope.hiddenBalanceChange = function () {
      profileService.toggleHideBalanceFlag(accountId, function (err) {
        if (err) $log.error(err)
      })
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      account = profileService.getAccount(data.stateParams.accountId)
      accountId = account.id
      $scope.account = account
      $scope.accountRepresentative = profileService.getRepresentativeFor(account.id)
      $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
      $scope.externalSource = null

      if (!account) { return $ionicHistory.goBack() }

      var config = configService.getSync()

      $scope.hiddenBalance = {
        value: $scope.account.meta.balanceHidden
      }

      $scope.touchIdAvailable = fingerprintService.isAvailable()
      $scope.touchIdEnabled = {
        value: config.touchIdFor ? config.touchIdFor[accountId] : null
      }
    })
  })

'use strict'

angular.module('canoeApp.controllers').controller('preferencesAbout',
  function ($scope, $window, appConfigService, gettextCatalog, externalLinkService) {
    $scope.title = gettextCatalog.getString('About') + ' ' + appConfigService.nameCase
    $scope.version = $window.version
    $scope.commitHash = $window.commitHash

    $scope.openExternalLink = function () {
      var url = 'https://github.com/imtiyazs/canoe'
      var optIn = true
      var title = gettextCatalog.getString('Open GitHub Project')
      var message = gettextCatalog.getString('You can see the latest developments and contribute to this open source app by visiting our project on GitHub.')
      var okText = gettextCatalog.getString('Open GitHub')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesAliasController',
  function ($scope, $timeout, $stateParams, $ionicHistory, $log, profileService, aliasService, ongoingProcess) {
    var account = profileService.getAccount($stateParams.accountId)
    var letterRegex = XRegExp('^\\p{Ll}+$')
    var lnRegex = XRegExp('^(\\p{Ll}|\\pN)+$')
    $scope.accountAlias = account.meta.alias || null
    var initialName = null
    $scope.emailValid = null
    $scope.aliasValid = null
    $scope.aliasRegistered = null
    $scope.checkingAlias = false
    if ($scope.accountAlias !== null) {
      initialName = $scope.accountAlias.alias
      $scope.aliasRegistered = false
      $scope.aliasValid = true
    }
    $scope.validateAlias = function (alias) {
      if (alias === initialName) return
      $scope.aliasRegistered = null
      if (alias && alias.length > 0 && alias.charAt(0) === '@') {
        alias = alias.substring(1, alias.length)
      }
      $scope.aliasValid = alias.length >= 4 && letterRegex.test(alias.charAt(0)) && lnRegex.test(alias)
      $scope.checkingAlias = true
      if ($scope.aliasValid === true) {
        aliasService.lookupAlias(alias, function (err, alias) {
          if (err === null) {
            if (alias.alias.address === account.id) {
              alias.alias.email = $scope.alias.value.email
              account.meta.alias = alias.alias
              profileService.saveWallet(function () {
                $log.info('Finished Creating and storing your alias')
                $ionicHistory.goBack()
              })
            }
            $scope.aliasRegistered = true
          } else {
            $scope.aliasRegistered = false
          }
          $scope.checkingAlias = false
          $scope.$apply()
        })
      } else {
        $scope.checkingAlias = false
      }
    }
    $scope.validateEmail = function (email) {
      $scope.emailValid = validator.isEmail(email)
    }
    $scope.alias = {
      value: $scope.accountAlias
    }
    $scope.isPrivate = false
    if ($scope.alias.value !== null && $scope.alias.value.listed === false) {
      $scope.isPrivate = true
    }

    $scope.save = function () {
      // Save the alias we have selected to use for our wallet
      var wallet = profileService.getWallet()
      var curAccount = account.id
      if ($scope.alias.value.alias && $scope.alias.value.alias.length > 0 && $scope.alias.value.alias.charAt(0) === '@') {
        $scope.alias.value.alias = $scope.alias.value.alias.substring(1, $scope.alias.value.alias.length)
      }
      var signatureParams = [
        $scope.alias.value.alias,
        curAccount
      ]
      var signature = wallet.aliasSignature(signatureParams).signature
      if ($scope.alias.value.seed) {
        signatureParams[0] = initialName
        signatureParams.push($scope.alias.value.seed)
        var privateSignature = wallet.aliasSignature(signatureParams).signature
        ongoingProcess.set('editingAlias', true)
        aliasService.editAlias(initialName, $scope.alias.value.alias, curAccount, $scope.alias.value.email, $scope.isPrivate, signature, privateSignature, function (err, ans) {
          if (err) {
            ongoingProcess.set('editingAlias', false)
            return $log.debug(err)
          }
          $log.debug('Answer from alias server editing: ' + JSON.stringify(ans))
          if (ans) {
            ans.alias.email = $scope.alias.value.email
            account.meta.alias = ans.alias
            profileService.saveWallet(function () {
              $log.info('Finished editing and storing your alias')
              $ionicHistory.goBack()
            })
          }
          ongoingProcess.set('editingAlias', false)
        })
      } else {
        ongoingProcess.set('creatingAlias', true)
        aliasService.createAlias($scope.alias.value.alias, curAccount, $scope.alias.value.email, $scope.isPrivate, signature, function (err, ans) {
          if (err) {
            ongoingProcess.set('creatingAlias', false)
            return $log.debug(err)
          }
          $log.debug('Answer from alias server creation: ' + JSON.stringify(ans))
          if (ans) {
            ans.alias.email = $scope.alias.value.email
            account.meta.alias = ans.alias
            profileService.saveWallet(function () {
              $log.info('Finished Creating and storing your alias')
              $ionicHistory.goBack()
            })
          }
          ongoingProcess.set('creatingAlias', false)
        })
      }
    }
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesAltCurrencyController',
  function ($scope, $log, $timeout, $ionicHistory, configService, rateService, lodash, storageService) {
    var next = 10
    var completeAlternativeList = []

    function init () {
      rateService.whenAvailable(function () {
        $scope.listComplete = false
        var idx = lodash.indexBy($scope.lastUsedAltCurrencyList, 'isoCode')
        completeAlternativeList = lodash.reject(rateService.listAlternatives(true), function (c) {
          return idx[c.isoCode]
        })

        // #98 Last is first... Sorted by population per country (+ corea and japan) from : https://www.internetworldstats.com/stats8.htm
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'JPY')) // Japan
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'KRW')) // Korea

        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'BRL')) // Brazil
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'IDR')) // Indonesia
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'USD')) // US
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'EUR')) // YUROP
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'INR')) // India
        completeAlternativeList = moveElementInArrayToTop(completeAlternativeList, findElement(completeAlternativeList, 'isoCode', 'CNY')) // China

        $scope.altCurrencyList = completeAlternativeList.slice(0, 10)

        $timeout(function () {
          $scope.$apply()
        })
      })
    }

    function moveElementInArrayToTop (array, value) {
      var oldIndex = array.indexOf(value)
      if (oldIndex > -1) {
        var newIndex = 0
        var arrayClone = array.slice()
        arrayClone.splice(oldIndex, 1)
        arrayClone.splice(newIndex, 0, value)
        return arrayClone
      }
      return array
    }

    function findElement (arr, propName, propValue) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i][propName] === propValue) { return arr[i] }
      }
    }

    $scope.loadMore = function () {
      $timeout(function () {
        $scope.altCurrencyList = completeAlternativeList.slice(0, next)
        next += 10
        $scope.listComplete = $scope.altCurrencyList.length >= completeAlternativeList.length
        $scope.$broadcast('scroll.infiniteScrollComplete')
      }, 100)
    }

    $scope.findCurrency = function (search) {
      if (!search) init()
      $scope.altCurrencyList = lodash.filter(completeAlternativeList, function (item) {
        var val = item.name
        var val2 = item.isoCode
        return lodash.includes(val.toLowerCase(), search.toLowerCase()) || lodash.includes(val2.toLowerCase(), search.toLowerCase())
      })
      $timeout(function () {
        $scope.$apply()
      })
    }

    $scope.save = function (newAltCurrency) {
      var opts = {
        wallet: {
          settings: {
            alternativeName: newAltCurrency.name,
            alternativeIsoCode: newAltCurrency.isoCode
          }
        }
      }

      configService.set(opts, function (err) {
        if (err) $log.warn(err)

        $ionicHistory.goBack()
        saveLastUsed(newAltCurrency)
        // Refresh ui
        $timeout(function () {
          configService.getSync().wallet.settings.alternativeIsoCode = newAltCurrency.isoCode
          // profileService.updateRate(newAltCurrency.isoCode, true)
          // $rootScope.$broadcast('rates.loaded')
        }, 30)
      })
    }

    function saveLastUsed (newAltCurrency) {
      $scope.lastUsedAltCurrencyList.unshift(newAltCurrency)
      $scope.lastUsedAltCurrencyList = lodash.uniq($scope.lastUsedAltCurrencyList, 'isoCode')
      $scope.lastUsedAltCurrencyList = $scope.lastUsedAltCurrencyList.slice(0, 3)
      storageService.setLastCurrencyUsed(JSON.stringify($scope.lastUsedAltCurrencyList), function () {})
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      var config = configService.getSync()
      $scope.currentCurrency = config.wallet.settings.alternativeIsoCode

      storageService.getLastCurrencyUsed(function (err, lastUsedAltCurrency) {
        $scope.lastUsedAltCurrencyList = lastUsedAltCurrency ? JSON.parse(lastUsedAltCurrency) : []
        init()
      })
    })
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesAttributions',
  function ($scope, externalLinkService) {
    $scope.openExternalDirect = function (url, target) {
      externalLinkService.open(url, target)
    }
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesColorController', function ($scope, $timeout, $log, $stateParams, $ionicHistory, configService, profileService) {
  var account = profileService.getAccount($stateParams.accountId)
  $scope.account = account
  var config = configService.getSync()
  config.colorFor = config.colorFor || {}

  var retries = 3
  $scope.colorCount = getColorCount()
  setCurrentColorIndex()

  $scope.save = function (i) {
    var color = indexToColor(i)
    if (!color) return
    account.meta.color = color
    profileService.saveWallet(function () {
      $ionicHistory.goBack()
    })
  }

  function getColorDefault () {
    return rgb2hex(window.getComputedStyle(document.getElementsByClassName('wallet-color-default')[0]).color)
  }

  function getColorCount () {
    var count = window.getComputedStyle(document.getElementsByClassName('wallet-color-count')[0]).content
    return parseInt(count.replace(/[^0-9]/g, ''))
  }

  function setCurrentColorIndex () {
    try {
      $scope.currentColorIndex = colorToIndex(account.meta.color || getColorDefault())
    } catch (e) {
      // Wait for DOM to render and try again.
      $timeout(function () {
        if (retries > 0) {
          retries -= 1
          setCurrentColorIndex()
        }
      }, 100)
    }
  }

  function colorToIndex (color) {
    for (var i = 0; i < $scope.colorCount; i++) {
      if (indexToColor(i) == color.toLowerCase()) {
        return i
      }
    }
    return undefined
  }

  function indexToColor (i) {
    // Expect an exception to be thrown if can't getComputedStyle().
    return rgb2hex(window.getComputedStyle(document.getElementsByClassName('wallet-color-' + i)[0]).backgroundColor)
  }

  function rgb2hex (rgb) {
    rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i)
    return (rgb && rgb.length === 4) ? '#' +
      ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : ''
  }
})

'use strict'

angular.module('canoeApp.controllers').controller('preferencesDeleteWalletController',
  function ($scope, $ionicHistory, gettextCatalog, lodash, profileService, $state, ongoingProcess, popupService, pushNotificationsService) {
    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      if (!data.stateParams || !data.stateParams.walletId) {
        popupService.showAlert(null, gettextCatalog.getString('No wallet selected'), function () {
          $ionicHistory.goBack()
        })
        return;
      }
      $scope.account = profileService.getAccount(data.stateParams.walletId)
      if (!$scope.account) {
        popupService.showAlert(null, gettextCatalog.getString('No wallet found'), function () {
          $ionicHistory.goBack()
        })
        return;
      }
      $scope.accountName = $scope.account.name
    })

    $scope.showDeletePopup = function () {
      var title = gettextCatalog.getString('Warning!')
      var message = gettextCatalog.getString('Are you sure you want to delete this wallet?')
      popupService.showConfirm(title, message, null, null, function (res) {
        if (res) deleteWallet()
      })
    };

    function deleteWallet () {
      ongoingProcess.set('deletingWallet', true)
      profileService.deleteWalletClient($scope.account, function (err) {
        ongoingProcess.set('deletingWallet', false)
        if (err) {
          popupService.showAlert(gettextCatalog.getString('Error'), err.message || err)
        } else {
          pushNotificationsService.unsubscribe($scope.account)
          $ionicHistory.nextViewOptions({
            disableAnimate: true,
            historyRoot: true
          })
          $ionicHistory.clearHistory()
          $state.go('tabs.settings').then(function () {
            $state.transitionTo('tabs.home')
          })
        }
      })
    };
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesLanguageController',
  function ($scope, $log, $ionicHistory, configService, uxLanguage, externalLinkService, gettextCatalog) {
    $scope.availableLanguages = uxLanguage.getLanguages()

    $scope.openExternalLink = function () {
      var url = 'https://poeditor.com/join/project/cnSZa85DRN'
      var optIn = true
      var title = gettextCatalog.getString('Open Translation Site')
      var message = gettextCatalog.getString('You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!')
      var okText = gettextCatalog.getString('Open POEditor')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.save = function (newLang) {
      var opts = {
        wallet: {
          settings: {
            defaultLanguage: newLang
          }
        }
      }

      uxLanguage._set(newLang)
      configService.set(opts, function (err) {
        if (err) $log.warn(err)
      })

      $ionicHistory.goBack()
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.currentLanguage = uxLanguage.getCurrentLanguage()
    })
  })

'use strict';

angular.module('canoeApp.controllers').controller('preferencesLogs',
  function($scope, historicLog, lodash, configService, gettextCatalog) {

    var config = configService.getSync();
    var logLevels = historicLog.getLevels();
    var selectedLevel;

    $scope.logOptions = lodash.indexBy(logLevels, 'level');

    var filterLogs = function(weight) {
      $scope.filteredLogs = historicLog.get(weight);
    };

    $scope.setOptionSelected = function(level) {
      var weight = $scope.logOptions[level].weight;
      $scope.fillClass = 'fill-bar-' + level;
      filterLogs(weight);
      lodash.each($scope.logOptions, function(opt) {
        opt.selected = opt.weight <= weight ? true : false;
        opt.head = opt.weight == weight;
      });

      // Save the setting.
      var opts = {
        log: {
          filter: level
        }
      };
      configService.set(opts, function(err) {
        if (err) $log.debug(err);
      });
    };

    $scope.prepareLogs = function() {
      var log = 'BCB Session Logs\n Be careful, this could contain sensitive private data\n\n';
      log += '\n\n';
      log += historicLog.get().map(function(v) {
        return '[' + v.timestamp + '][' + v.level + ']' + v.msg;
      }).join('\n');

      return log;
    };

    $scope.sendLogs = function() {
      var body = $scope.prepareLogs();

      window.plugins.socialsharing.shareViaEmail(
        body,
        'BCB Logs',
        null, // TO: must be null or an array
        null, // CC: must be null or an array
        null, // BCC: must be null or an array
        null, // FILES: can be null, a string, or an array
        function() {},
        function() {}
      );
    };

    $scope.showOptionsMenu = function() {
      $scope.showOptions = true;
    };

    $scope.$on("$ionicView.beforeEnter", function(event, data) {
      selectedLevel = lodash.has(config, 'log.filter') ? historicLog.getLevel(config.log.filter) : historicLog.getDefaultLevel();
      $scope.setOptionSelected(selectedLevel.level);
    });

    $scope.$on("$ionicView.enter", function(event, data) {
      filterLogs(selectedLevel.weight);
    });
  });

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesNameController',
  function ($scope, $stateParams, $ionicHistory, profileService, popupService, gettextCatalog) {
    var account = profileService.getAccount($stateParams.accountId)
    $scope.accountName = account.meta.label
    $scope.name = {
      value: $scope.accountName
    }

    $scope.save = function () {
      if (profileService.getAccountWithName($scope.name.value)) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('An account already exists with that name'))
        return
      }
      account.meta.label = $scope.name.value
      profileService.saveWallet(function () {
        $ionicHistory.goBack()
      })
    }
  })

'use strict'

angular.module('canoeApp.controllers').controller('preferencesNotificationsController', function ($scope, $log, $timeout, appConfigService, lodash, configService, platformInfo, pushNotificationsService, emailService) {
  var updateConfig = function () {
    var config = configService.getSync()
    $scope.appName = appConfigService.nameCase
    $scope.PNEnabledByUser = true
    // TODO, disabled for now
    $scope.usePushNotifications = false // platformInfo.isCordova && !platformInfo.isWP
    $scope.isIOSApp = platformInfo.isIOS && platformInfo.isCordova

    $scope.pushNotifications = {
      value: config.pushNotificationsEnabled
    }

    var isConfirmedTxsNotificationsEnabled = config.confirmedTxsNotifications ? config.confirmedTxsNotifications.enabled : false
    $scope.confirmedTxsNotifications = {
      value: isConfirmedTxsNotificationsEnabled
    }

    $scope.latestEmail = {
      value: emailService.getEmailIfEnabled()
    }

    $scope.newEmail = lodash.clone($scope.latestEmail)
    var isEmailEnabled = config.emailNotifications ? config.emailNotifications.enabled : false

    $scope.emailNotifications = {
      value: !!(isEmailEnabled && $scope.newEmail.value)
    }

    $timeout(function () {
      $scope.$apply()
    })
  }

  $scope.pushNotificationsChange = function () {
    if (!$scope.pushNotifications) return
    var opts = {
      pushNotificationsEnabled: $scope.pushNotifications.value
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
      if (opts.pushNotificationsEnabled) { pushNotificationsService.init() } else { pushNotificationsService.disable() }
    })
  }

  $scope.confirmedTxsNotificationsChange = function () {
    if (!$scope.pushNotifications) return
    var opts = {
      confirmedTxsNotifications: {
        enabled: $scope.confirmedTxsNotifications.value
      }
    }
    configService.set(opts, function (err) {
      if (err) $log.debug(err)
    })
  }

  $scope.emailNotificationsChange = function () {
    var opts = {
      enabled: $scope.emailNotifications.value,
      email: $scope.newEmail.value
    }

    $scope.latestEmail = {
      value: emailService.getEmailIfEnabled()
    }

    emailService.updateEmail(opts)
  }

  $scope.save = function () {
    emailService.updateEmail({
      enabled: $scope.emailNotifications.value,
      email: $scope.newEmail.value
    })

    $scope.latestEmail = {
      value: $scope.newEmail.value
    }

    $timeout(function () {
      $scope.$apply()
    })
  }

  $scope.$on('$ionicView.enter', function (event, data) {
    updateConfig()
  })
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesRepresentativeController',
  function ($scope, $timeout, $stateParams, $ionicHistory, profileService, nanoService, popupService, gettextCatalog) {
    var account = profileService.getAccount($stateParams.accountId)
    $scope.accountRepresentative = profileService.getRepresentativeFor(account.id)
    $scope.representative = {
      value: $scope.accountRepresentative
    }

    $scope.onQrCodeScanned = function (data, form) {
      $timeout(function () {
        if (data && form) {
          nanoService.parseQRCode(data, function (err, code) {
            if (err) {
              // Trying to scan an incorrect QR code
              popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Incorrect code format for an account: ' + err))
              return
            }
            form.representative.$setViewValue(code.account)
            form.representative.$isValid = true
            form.representative.$render()
          })
        }
        $scope.$digest()
      }, 100)
    }

    $scope.save = function () {
      // Creates an outgoing change block
      nanoService.changeRepresentative(account.id, $scope.representative.value)
      profileService.saveWallet(function () {
        $ionicHistory.goBack()
      })
    }
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('preferencesSecurityController', function ($state, $rootScope, $scope, $timeout, $log, configService, gettextCatalog, fingerprintService, profileService, lodash, applicationService) {
  function init () {
 
  }

  $scope.$on('$ionicView.beforeEnter', function (event) {
    init()
  })

  $scope.changePIN = function () {
    applicationService.pinModal('setup')
  }

  $rootScope.$on('pinModalClosed', function () {
    init()
  })
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabHomeController',
  function ($rootScope, $timeout, $scope, $state, $stateParams, $ionicScrollDelegate, $window, gettextCatalog, lodash, popupService, ongoingProcess, externalLinkService, latestReleaseService, profileService, configService, $log, platformInfo, storageService, appConfigService, startupService, addressbookService, feedbackService, buyAndSellService, homeIntegrationsService, pushNotificationsService, timeService) {
    var listeners = []
    $scope.externalServices = {}
    $scope.version = $window.version
    $scope.name = appConfigService.nameCase
    $scope.homeTip = $stateParams.fromOnboarding
    $scope.isCordova = platformInfo.isCordova
    $scope.isAndroid = platformInfo.isAndroid
    $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    $scope.isNW = platformInfo.isNW
    $scope.showRateCard = {}
    $scope.serverMessage = null

    $scope.$on('$ionicView.afterEnter', function () {
      startupService.ready()
    })

    $scope.openExternalLinkHelp = function () {
    // TODO var url = 'http://bitcoin.black/' + uxLanguage.getCurrentLanguage() + '/help'
      var url = 'https://bitcoin.black/mobile-wallet-faq/'
      var optIn = true
      var title = null
      var message = gettextCatalog.getString('Help and support information is available at the website.')
      var okText = gettextCatalog.getString('Open')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.$on('$ionicView.beforeEnter', function (event, data) {
      $scope.accounts = profileService.getAccounts()
      $scope.singleAccount = $scope.accounts.length === 1

      if (!$scope.accounts[0]) return

      if (!$scope.homeTip) {
        storageService.getHomeTipAccepted(function (error, value) {
          $scope.homeTip = value !== 'accepted'
        })
      }

      if ($scope.isNW) {
        latestReleaseService.checkLatestRelease(function (err, newRelease) {
          if (err) {
            $log.warn(err)
            return
          }
          if (newRelease) {
            $scope.newRelease = true
            $scope.updateText = gettextCatalog.getString('There is a new version of BCB wallet available', {
              appName: $scope.name
            })
          }
        })
      }

      storageService.getFeedbackInfo(function (error, info) {
        if ($scope.isWindowsPhoneApp) {
          $scope.showRateCard.value = false
          return
        }
        if (!info) {
          initFeedBackInfo()
        } else {
          var feedbackInfo = JSON.parse(info)
          // Check if current version is greater than saved version
          var currentVersion = $scope.version
          var savedVersion = feedbackInfo.version
          var isVersionUpdated = feedbackService.isVersionUpdated(currentVersion, savedVersion)
          if (!isVersionUpdated) {
            initFeedBackInfo()
            return
          }
          var now = moment().unix()
          var timeExceeded = (now - feedbackInfo.time) >= 24 * 7 * 60 * 60
          $scope.showRateCard.value = timeExceeded && !feedbackInfo.sent
          $timeout(function () {
            $scope.$apply()
          })
        }
      })

      function initFeedBackInfo () {
        var feedbackInfo = {}
        feedbackInfo.time = moment().unix()
        feedbackInfo.version = $scope.version
        feedbackInfo.sent = false
        storageService.setFeedbackInfo(JSON.stringify(feedbackInfo), function () {
          $scope.showRateCard.value = false
        })
      }
    })

    $scope.$on('$ionicView.enter', function (event, data) {
      addressbookService.list(function (err, ab) {
        if (err) $log.error(err)
        $scope.addressbook = ab || {}
      })

      listeners = [
        $rootScope.$on('servermessage', function (event, message) {
          $scope.serverMessage = message
          $timeout(function () {
            $scope.$apply()
          })
        }),
        $rootScope.$on('walletloaded', function (event) {
          $log.debug('Wallet loaded')
          $scope.accounts = profileService.getAccounts()
        }),
        $rootScope.$on('work', function (event) {
          $scope.work = profileService.getPoW()
          if ($scope.work) {
            for (var i = 0; i < $scope.accounts.length; i++) {
              if ($scope.work[$scope.accounts[i].id] && ($scope.accounts[i].work === null || typeof $scope.accounts[i].work === "undefined")) {
                console.log("Work found for wallet " + i)
                $scope.accounts[i].work = $scope.work[$scope.accounts[i].id]
              } else if (!$scope.work[$scope.accounts[i].id]) {
                console.log("Work is null for " + i)
                $scope.accounts[i].work = null
                $scope.$apply()
              }
            }
          }
        }),
        $rootScope.$on('blocks', function (event, account) {
          if (account === null) {
            $scope.accounts = profileService.getAccounts()
          }
          $timeout(function () {
            $scope.$apply()
          })
        })
      ]

      $scope.buyAndSellItems = buyAndSellService.getLinked()
      $scope.homeIntegrations = homeIntegrationsService.get()

      configService.whenAvailable(function (config) {
        pushNotificationsService.init()

        $timeout(function () {
          $ionicScrollDelegate.resize()
          $scope.$apply()
        }, 10)
      })
    })

    $scope.$on('$ionicView.leave', function (event, data) {
      lodash.each(listeners, function (x) {
        x()
      })
    })

    $scope.createdWithinPastDay = function (time) {
      return timeService.withinPastDay(time)
    }

    $scope.goToDownload = function () {
      var url = 'http://bitcoin.black/download'
      var optIn = true
      var title = gettextCatalog.getString('Update Available')
      var message = gettextCatalog.getString('A new version of this app is available. Please update to the latest version.')
      var okText = gettextCatalog.getString('View Update')
      var cancelText = gettextCatalog.getString('Go Back')
      externalLinkService.open(url, optIn, title, message, okText, cancelText)
    }

    $scope.openServerMessageLink = function () {
      var url = $scope.serverMessage.link
      externalLinkService.open(url)
    }

    /*
    $scope.openNotificationModal = function (n) {
      wallet = profileService.getAccount(n.walletId)

      if (n.txid) {
        $state.transitionTo('tabs.account.tx-details', {
          txid: n.txid,
          walletId: n.walletId
        })
      } else {
        var txp = lodash.find($scope.txps, {
          id: n.txpId
        })
        if (txp) {
          // txpModalService.open(txp)
        } else {
          ongoingProcess.set('loadingTxInfo', true)
          walletService.getTxp(wallet, n.txpId, function (err, txp) {
            var _txp = txp
            ongoingProcess.set('loadingTxInfo', false)
            if (err) {
              $log.warn('No txp found')
              return popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Transaction not found'))
            }
            // txpModalService.open(_txp)
          })
        }
      }
    } */

    $scope.openAccount = function (account) {
      $state.go('tabs.account', {
        accountId: account.id
      })
    }

    $rootScope.$on('rates.loaded', function () {
      // Display alternative balance
      $scope.accounts = profileService.getAccounts()
      $scope.$apply()
    })

    var performUpdate = function (cb) {
      $scope.accounts = profileService.getAccounts()
      $scope.serverMessage = null
    }

    $scope.hideHomeTip = function () {
      storageService.setHomeTipAccepted('accepted', function () {
        $scope.homeTip = false
        $timeout(function () {
          $scope.$apply()
        })
      })
    }

    $scope.onRefresh = function () {
      performUpdate()
      $scope.$broadcast('scroll.refreshComplete')
      $ionicScrollDelegate.resize()
      $timeout(function () {
        $scope.$apply()
      })
    }
  })

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabReceiveController', function ($scope, $ionicModal, $state, platformInfo, profileService, lodash, gettextCatalog) {
  var listeners = []
  $scope.wallet = profileService.getWallet()
  $scope.isCordova = platformInfo.isCordova
  $scope.isNW = platformInfo.isNW

  $scope.openBackupNeededModal = function () {
    $ionicModal.fromTemplateUrl('views/includes/backupNeededPopup.html', {
      scope: $scope,
      backdropClickToClose: false,
      hardwareBackButtonClose: false
    }).then(function (modal) {
      $scope.BackupNeededModal = modal
      $scope.BackupNeededModal.show()
    })
  }

  $scope.close = function () {
    $scope.BackupNeededModal.hide()
    $scope.BackupNeededModal.remove()
  }

  $scope.doBackup = function () {
    $scope.close()
    $scope.goToBackupFlow()
  }

  $scope.goToBackupFlow = function () {
    $state.go('tabs.receive.backupWarning', {
      from: 'tabs.receive',
      walletId: $scope.account.credentials.walletId
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.accounts = profileService.getAccounts()
    $scope.singleAccount = $scope.accounts.length === 1

    if (!$scope.accounts[0]) return

    // select first account if no account selected previously
    var selectedAccount = checkSelectedAccount($scope.account, $scope.accounts)
    $scope.onAccountSelect(selectedAccount)

    $scope.showShareButton = platformInfo.isCordova ? (platformInfo.isIOS ? 'iOS' : 'Android') : null

    listeners = []
  })

  $scope.$on('$ionicView.leave', function (event, data) {
    lodash.each(listeners, function (x) {
      x()
    })
  })

  var checkSelectedAccount = function (account, accounts) {
    if (!account) return accounts[0]
    var w = lodash.findIndex(accounts, function (w) {
      return w.id === account.id
    })
    if (w < 0) return accounts[0]
    return accounts[w]
  }

  $scope.onAccountSelect = function (acc) {
    if (!acc) {
      $state.go('tabs.create-account')
    } else {
      $scope.account = acc
      $scope.addr = acc.id
      $scope.addrUrl = 'bcb:' + acc.id
    }
  }

  $scope.showAccountSelector = function () {
    if ($scope.singleAccount) return
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.showAccounts = true
  }

  $scope.shareAccount = function () {
    if (!$scope.isCordova) return
    window.plugins.socialsharing.share($scope.addr, null, null, null)
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabScanController', function ($scope, $log, $timeout, scannerService, popupService, gettextCatalog, soundService, incomingData, $state, $ionicHistory, $rootScope) {
  var scannerStates = {
    unauthorized: 'unauthorized',
    denied: 'denied',
    unavailable: 'unavailable',
    loading: 'loading',
    visible: 'visible'
  }
  $scope.scannerStates = scannerStates

  function _updateCapabilities () {
    var capabilities = scannerService.getCapabilities()
    $scope.scannerIsAvailable = capabilities.isAvailable
    $scope.scannerHasPermission = capabilities.hasPermission
    $scope.scannerIsDenied = capabilities.isDenied
    $scope.scannerIsRestricted = capabilities.isRestricted
    $scope.canEnableLight = capabilities.canEnableLight
    $scope.canChangeCamera = capabilities.canChangeCamera
    $scope.canOpenSettings = capabilities.canOpenSettings
  }

  function _handleCapabilities () {
    // always update the view
    $timeout(function () {
      if (!scannerService.isInitialized()) {
        $scope.currentState = scannerStates.loading
      } else if (!$scope.scannerIsAvailable) {
        $scope.currentState = scannerStates.unavailable
      } else if ($scope.scannerIsDenied) {
        $scope.currentState = scannerStates.denied
      } else if ($scope.scannerIsRestricted) {
        $scope.currentState = scannerStates.denied
      } else if (!$scope.scannerHasPermission) {
        $scope.currentState = scannerStates.unauthorized
      }
      $log.debug('Scan view state set to: ' + $scope.currentState)
    })
  }

  function _refreshScanView () {
    _updateCapabilities()
    _handleCapabilities()
    if ($scope.scannerHasPermission) {
      activate()
    }
  }

  // This could be much cleaner with a Promise API
  // (needs a polyfill for some platforms)
  $rootScope.$on('scannerServiceInitialized', function () {
    $log.debug('Scanner initialization finished, reinitializing scan view...')
    _refreshScanView()
  })

  $scope.$on('$ionicView.afterEnter', function () {
    // try initializing and refreshing status any time the view is entered
    if (!scannerService.isInitialized()) {
      scannerService.gentleInitialize()
    }
    activate()
  })

  function activate () {
    scannerService.activate(function () {
      _updateCapabilities()
      _handleCapabilities()
      $log.debug('Scanner activated, setting to visible...')
      $scope.currentState = scannerStates.visible
        // pause to update the view
      $timeout(function () {
        scannerService.scan(function (err, contents) {
          if (err) {
            $log.debug('Scan canceled.')
          } else if ($state.params.passthroughMode) {
            $rootScope.scanResult = contents
            goBack()
          } else {
            handleSuccessfulScan(contents)
          }
        })
        // resume preview if paused
        scannerService.resumePreview()
      })
    })
  }
  $scope.activate = activate

  $scope.authorize = function () {
    scannerService.initialize(function () {
      _refreshScanView()
    })
  }

  $scope.$on('$ionicView.afterLeave', function () {
    scannerService.deactivate()
  })

  function handleSuccessfulScan (contents) {
    $log.debug('Scan returned: "' + contents + '"')
    scannerService.pausePreview()
    incomingData.redir(contents, null, function (err, code) {
      if (err) {
        console.log(err)
        popupService.showAlert(
          gettextCatalog.getString('Error'),
          gettextCatalog.getString('Unrecognized data'), function () {
            // Try again
            activate()
          }
        )
      }
    })
  }

  $rootScope.$on('incomingDataMenu.menuHidden', function () {
    activate()
  })

  $scope.openSettings = function () {
    scannerService.openSettings()
  }

  $scope.attemptToReactivate = function () {
    scannerService.reinitialize()
  }

  $scope.toggleLight = function () {
    scannerService.toggleLight(function (lightEnabled) {
      $scope.lightActive = lightEnabled
      $scope.$apply()
    })
  }

  $scope.toggleCamera = function () {
    $scope.cameraToggleActive = true
    scannerService.toggleCamera(function (status) {
    // (a short delay for the user to see the visual feedback)
      $timeout(function () {
        $scope.cameraToggleActive = false
        $log.debug('Camera toggle control deactivated.')
      }, 200)
    })
  }

  $scope.canGoBack = function () {
    return $state.params.passthroughMode
  }
  function goBack () {
    $ionicHistory.nextViewOptions({
      disableAnimate: true
    })
    $ionicHistory.backView().go()
  }
  $scope.goBack = goBack
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabSendController', function ($scope, $rootScope, $log, $timeout, $ionicScrollDelegate, addressbookService, profileService, lodash, $state, incomingData, popupService, platformInfo, gettextCatalog, scannerService, externalLinkService) {
  var originalList
  var completeContacts
  var CONTACTS_SHOW_LIMIT
  var currentContactsPage
  $scope.isChromeApp = platformInfo.isChromeApp
  $scope.serverMessage = null

  var updateAccountsList = function () {
    $scope.showTransferCard = $scope.hasMoreAccounts
    $scope.hasFunds = profileService.hasFunds()
    if ($scope.showTransferCard) {
      var accountList = []
      lodash.each($scope.accounts, function (acc) {
        accountList.push({
          meta: acc.meta,
          color: acc.meta.color,
          name: acc.name,
          alias: lodash.isObject(v) ? v.alias : null,
          avatar: lodash.isObject(v) ? v.avatar : null,
          recipientType: 'account',
          address: acc.id
        })
      })
      originalList = originalList.concat(accountList)
    }
  }

  var updateContactsList = function (cb) {
    addressbookService.list(function (err, ab) {
      if (err) $log.error(err)

      $scope.hasContacts = !lodash.isEmpty(ab)
      if (!$scope.hasContacts) return cb()

      completeContacts = []
      lodash.each(ab, function (v, k) {
        completeContacts.push({
          name: lodash.isObject(v) ? v.name : v,
          address: k,
          email: lodash.isObject(v) ? v.email : null,
          alias: lodash.isObject(v) ? v.alias : null,
          avatar: lodash.isObject(v) ? v.avatar : null,
          recipientType: 'contact',
          getAddress: function (cb) {
            return cb(null, k)
          }
        })
      })
      var contacts = completeContacts.slice(0, (currentContactsPage + 1) * CONTACTS_SHOW_LIMIT)
      $scope.contactsShowMore = completeContacts.length > contacts.length
      $scope.contactsShowMoreSaved = $scope.contactsShowMore
      originalList = originalList.concat(contacts)
      return cb()
    })
  }

  var updateList = function () {
    $scope.list = lodash.clone(originalList)
    $timeout(function () {
      $ionicScrollDelegate.resize()
      $scope.$apply()
    }, 10)
  }

  $scope.openScanner = function () {
    var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

    if (!isWindowsPhoneApp) {
      $state.go('tabs.scan')
      return
    }

    scannerService.useOldScanner(function (err, contents) {
      if (err) {
        popupService.showAlert(gettextCatalog.getString('Error'), err)
        return
      }
      incomingData.redir(contents, $scope.acc.id)
    })
  }

  $scope.showMore = function () {
    currentContactsPage++
    originalList = []
    updateAccountsList()
    updateContactsList(function () {
      updateList()
    })
  }

  $scope.searchInFocus = function () {
    $scope.searchFocus = true
  }

  $scope.searchBlurred = function () {
    if ($scope.formData.search === null || $scope.formData.search.length === 0) {
      $scope.searchFocus = false
    }
  }

  $scope.findContact = function (search) {
    // If redir returns true it matched something and
    // will already have moved us to amount.
    incomingData.redir(search, $scope.acc.id, function (err, code) {
      if (err) {
        // Ok, redir did not match anything, then we search
        if (!search || search.length < 2) {
          $scope.list = originalList
          $scope.contactsShowMore = $scope.contactsShowMoreSaved
          $timeout(function () {
            $scope.$apply()
          })
          return
        }
        var sea = search.toLowerCase()
        var result = lodash.filter(completeContacts, function (item) {
          return (
            // If name has substring, or address startsWith, or email startsWith
            // or alias startsWith
            lodash.includes(item.name.toLowerCase(), sea) ||
            (item.address && item.address.toLowerCase().startsWith(sea)) ||
            (item.alias && item.alias.alias && item.alias.alias.toLowerCase().startsWith(sea)) ||
            (item.email && item.email.toLowerCase().startsWith(sea))
          )
        })
        $scope.list = result
        $scope.contactsShowMore = false
      }
    })
  }

  $scope.goToAmount = function (item) {
    $timeout(function () {
      var toAlias = null
      if (item.meta && item.meta.alias && item.meta.alias.alias) {
        toAlias = item.meta.alias.alias
      }
      return $state.transitionTo('tabs.send.amount', {
        recipientType: item.recipientType,
        toAddress: item.address,
        toName: item.name,
        toEmail: item.email,
        toColor: item.color,
        toAlias: toAlias,
        fromAddress: $scope.acc.id
      })
    })
  }

  $rootScope.$on('servermessage', function (event, message) {
    $scope.serverMessage = message
    $timeout(function () {
      $scope.$apply()
    })
  })

  $scope.openServerMessageLink = function () {
    var url = $scope.serverMessage.link
    externalLinkService.open(url)
  }

  // This could probably be enhanced refactoring the routes abstract states
  $scope.createAccount = function () {
    $state.go('tabs.home').then(function () {
      $state.go('tabs.create-account')
    })
  }

  $scope.buyBitcoin = function () {
    $state.go('tabs.home').then(function () {
      $state.go('tabs.buyandsell')
    })
  }

  $scope.onAccountSelect = function (acc) {
    if (!acc) {
      $state.go('tabs.create-account')
    } else {
      $scope.acc = acc
      $scope.account = acc
    }
  }

  $scope.showAccountSelector = function () {
    if ($scope.singleAccount) return
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.showAccounts = true
  }

  var checkSelectedAccount = function (account, accounts) {
    if (!account) return accounts[0]
    var w = lodash.findIndex(accounts, function (w) {
      return w.id === account.id
    })
    if (!w) return accounts[0]
    return accounts[w]
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.accounts = profileService.getAccounts()
    $scope.singleAccount = $scope.accounts.length === 1
    $scope.hasAccounts = !lodash.isEmpty($scope.accounts)
    var selectedAccount = checkSelectedAccount($scope.acc, $scope.accounts)
    $scope.onAccountSelect(selectedAccount)
    $scope.accountSelectorTitle = gettextCatalog.getString('Select an account')
    $scope.hasMoreAccounts = $scope.accounts.length > 1
    $scope.checkingBalance = true
    $scope.formData = {
      search: null
    }
    originalList = []
    CONTACTS_SHOW_LIMIT = 50
    currentContactsPage = 0
  })

  $scope.$on('$ionicView.enter', function (event, data) {
    if (!$scope.hasAccounts) {
      $scope.checkingBalance = false
      return
    }
    updateAccountsList()
    updateContactsList(function () {
      updateList()
    })
  })
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabSettingsController', function ($rootScope, $timeout, $scope, appConfigService, $ionicModal, $log, lodash, uxLanguage, platformInfo, profileService, configService, externalLinkService, gettextCatalog, addressbookService, applicationService, $state, $ionicHistory) {
  var updateConfig = function () {
    $scope.currentLanguageName = uxLanguage.getCurrentLanguageName()
    // $scope.buyAndSellServices = buyAndSellService.getLinked()
    $scope.hasFunds = profileService.hasFunds()
    configService.whenAvailable(function (config) {
      $scope.selectedAlternative = {
        name: config.wallet.settings.alternativeName,
        isoCode: config.wallet.settings.alternativeIsoCode
      }
    })
  }

  $scope.openDonate = function () {
      if($scope.hasFunds){
        addressbookService.getDonate(function (err, ab) {
          if (err) $log.error(err)
          $ionicHistory.removeBackView()
          $state.go('tabs.send')
          $timeout(function () {
            return $state.transitionTo('tabs.send.amount', {
              recipientType: 'contact',
              toAddress: ab.address,
              toName: ab.name,
              toEmail: ab.email,
              toColor: ab.color,
              toAlias: ab.alias
            })
          }, 100)
        })
      }
  }

  $scope.lockCanoe = function () {
    $state.transitionTo('tabs.home').then(function () {
      // Clear history
      $ionicHistory.clearHistory()
    })
    applicationService.lockPassword()
  }

  $scope.openExternalLinkHelp = function () {
    // TODO var url = 'http://bitcoin.black/' + uxLanguage.getCurrentLanguage() + '/help'
    var url = 'https://bitcoin.black/support/'
    var optIn = true
    var title = null
    var message = gettextCatalog.getString('Help and support information is available at the website.')
    var okText = gettextCatalog.getString('Open')
    var cancelText = gettextCatalog.getString('Go Back')
    externalLinkService.open(url, optIn, title, message, okText, cancelText)
  }

  $scope.openExternalLinkHowToBuy = function () {
    // TODO var url = 'http://bitcoin.black/' + uxLanguage.getCurrentLanguage() + '/howtobuy'
    var url = 'https://bitcoin.black/buy'
    var optIn = true
    var title = null
    var message = gettextCatalog.getString('How to buy and sell BCB is described at the website.')
    var okText = gettextCatalog.getString('Open')
    var cancelText = gettextCatalog.getString('Go Back')
    externalLinkService.open(url, optIn, title, message, okText, cancelText)
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.accounts = profileService.getAccounts()
    $scope.isCordova = platformInfo.isCordova
    $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP
    $scope.isDevel = platformInfo.isDevel
    $scope.appName = appConfigService.nameCase
/*  configService.whenAvailable(function (config) {
      $scope.locked = config.lock && config.lock.method
      if (!$scope.locked || $scope.locked === 'none') { $scope.method = gettextCatalog.getString('Disabled') } else { $scope.method = $scope.locked.charAt(0).toUpperCase() + config.lock.method.slice(1) }
    })
*/
  })

  $scope.$on('$ionicView.enter', function (event, data) {
    updateConfig()
  })
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabsController', function ($rootScope, $log, $scope, $state, $stateParams, $timeout, platformInfo, incomingData, lodash, popupService, gettextCatalog, scannerService) {
  $scope.onScan = function (data) {
    incomingData.redir(data, null, function (err, code) {
      if (err) {
        popupService.showAlert(gettextCatalog.getString('Error'), gettextCatalog.getString('Unrecognized data'))
      }
    })
  }

  $scope.setScanFn = function (scanFn) {
    $scope.scan = function () {
      $log.debug('Scanning...')
      scanFn()
    }
  }

  $scope.importInit = function () {
    $scope.fromOnboarding = $stateParams.fromOnboarding
    $timeout(function () {
      $scope.$apply()
    }, 1)
  }

  $scope.chooseScanner = function () {
    var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

    if (!isWindowsPhoneApp) {
      $state.go('tabs.scan')
      return
    }

    scannerService.useOldScanner(function (err, contents) {
      if (err) {
        popupService.showAlert(gettextCatalog.getString('Error'), err)
        return
      }
      incomingData.redir(contents, null)
    })
  }
})

'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('txDetailsController', function ($log, $ionicHistory, $scope, $state, $timeout, $stateParams, lodash, gettextCatalog, profileService, externalLinkService, addressbookService) {
  var listeners = []

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    // txId = data.stateParams.txid
    $scope.ntx = $stateParams.ntx
    $scope.hasFunds = profileService.hasFunds()
    $scope.title = gettextCatalog.getString('Transaction')
    $scope.account = profileService.getAccount($stateParams.walletId)
    listeners = []
  })

  addressbookService.list(function (err, ab) {
    if (err) $log.error(err)
    $scope.addressbook = ab || {}
  })

  $scope.refund = function () {
    addressbookService.get($scope.ntx.origin, function (err, addr) {
      $ionicHistory.clearHistory()
      $state.go('tabs.send').then(function () {
        $timeout(function () {
          $state.transitionTo('tabs.send.confirm', {
            recipientType: addr ? 'contact' : null,
            toAmount: $scope.ntx.amount,
            toName: addr ? addr.name : null,
            toAddress: $scope.ntx.origin,
            fromAddress: $stateParams.accountId
            //description: ''
          })
        }, 50)
      })
    })
  }

  $scope.$on('$ionicView.leave', function (event, data) {
    lodash.each(listeners, function (x) {
      x()
    })
  })

  $scope.showCommentPopup = function () {
    /* var opts = {}
    if ($scope.ntx.note) opts.defaultText = $scope.ntx.note
    popupService.showPrompt($scope.account.name, gettextCatalog.getString('Memo'), opts, function (text) {
      if (typeof text === 'undefined') return
      $scope.ntx.note = {
        body: text
      }
      $log.debug('Saving memo')

      var args = {
        hash: $scope.ntx.hash,
        body: text
      }
      walletService.editTxNote($scope.account, args, function (err, res) {
        if (err) {
          $log.debug('Could not save transaction note ' + err)
        }
      })
    }) */
  }

  $scope.viewOnNanode = function () {
    var ntx = $scope.ntx
    var url = 'https://beta.explore.black/#/explorer/block/' + ntx.hash
    var optIn = true
    var title = null
    var message = gettextCatalog.getString('View Block on BCB Block Explorer')
    var okText = gettextCatalog.getString('Open')
    var cancelText = gettextCatalog.getString('Go Back')
    externalLinkService.open(url, optIn, title, message, okText, cancelText)
  }
})

'use strict';

angular.module('canoeApp.controllers').controller('versionController', function() {
  this.version = window.version;
  this.commitHash = window.commitHash;
});

angular.module('canoeApp').run(['gettextCatalog', function (gettextCatalog) {
/* jshint -W100 */
    gettextCatalog.setStrings('ar', {"A member of the team will review your feedback as soon as possible.":"سيراجع أحد أفراد فريق العمل ردكم في أقرب فرصة.","About":"عنا","Account Information":"معلومات الحساب","Account Name":"اسم الحساب","Account Settings":"اعدادات الحساب","Account name":"اسم الحساب","Accounts":"حسابات","Add Contact":"اضافة جهة اتصال","Add account":"اضف حساب","Add as a contact":"اضف كجهة اتصال","Add description":"اضف وصف","Address Book":"دفتر العناوين","Advanced":"اعدادات متقدمة","Advanced Settings":"اعدادات متقدمة","Allow Camera Access":"السماح للكاميرا","Allow notifications":"السماح للتنبيهات","Almost done! Let's review.":"انتهينا تقريبا! لنراجع.","Alternative Currency":"علمة بديلة","Amount":"المبلغ","Are you being watched?":"هل انت مراقب؟","Are you sure you want to delete this contact?":"هل انت متأكد من الغاء جهة الإتصال؟","Are you sure you want to delete this wallet?":"هل انت متأكد من الغاء المحفظة؟","Are you sure you want to skip it?":"هل انت متأكد من التخطي؟","Backup Needed":"يجب عليك خلق نسخة احتياطية","Backup now":"اخلق نسخة احتياطية الان","Backup wallet":"نسخ احتياطي للمحفظة","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"تأكد من حفظ النواة (seed) في مكان امن. اذا حذفت التطبيق, او فقدت الجهاز, فالنواة هي الوسيلة الوحيدة لإسترجاع المحفظة.","Browser unsupported":"المتصفح غير مدعوم","But do not lose your seed!":"احذر من فقدان النواة (seed)","Buy &amp; Sell Bitcoin":"NOT NEEDED","Cancel":"الغاء","Cannot Create Wallet":"لا يمكن خلق محفظة","Choose a backup file from your computer":"الرجاء اختيار ملف نسخة احتياطية من جهاز الكمبيوتر","Click to send":"اضغط للإرسال","Close":"إغلاق","Coin":"عُملة","Color":"لون","Commit hash":"توقيع إيداع البيانات (commit hash)","Confirm":"تأكيد","Confirm &amp; Finish":"تأكيد وإنهاء","Contacts":"جهات الإتصال","Continue":"متابعة","Contribute Translations":"المساعدة بالترجمة","Copied to clipboard":"تم النسخ للحافظة","Copy this text as it is to a safe place (notepad or email)":"احفظ النص في مكان امن (على ورقة أو البريد الإلكتروني)","Copy to clipboard":"نسخ للحافظة","Could not access the wallet at the server. Please check:":"لم نتمكن من الدخول للمحفظة على الخادم. الرجاء التأكد:","Create Account":"إنشاء حساب","Create new account":"إنشاء حساب جديد","Creating Wallet...":"جار إنشاء محفظة ...","Creating account...":"جار إنشاء حساب ...","Creating transaction":"جار إجراء المعاملة","Date":"تاريخ","Default Account":"حساب افتراضي","Delete":"حذف","Delete Account":"حذف حساب","Delete Wallet":"حذف محفظة","Deleting Wallet...":"جار حذف محفظة ..","Do it later":"قم بذلك لاحقا","Donate to Bitcoin Black":"تبرع لكانوو","Download":"تحميل","Edit":"تحرير","Email":"البريد الالكتروني","Email Address":"عنوان البريد الالكتروني","Enable camera access in your device settings to get started.":"فَعِل صلاحيات الكاميرا في الهاتف للبدء","Enable email notifications":"فَعِل تنبيهات البريد","Enable push notifications":"فَعِل تنبيهات الهاتف","Enable the camera to get started.":"فَعِل الكاميرا للبدء","Enter amount":"ادخل المبلغ","Enter wallet seed":"ادخل نواة (seed) المحفظة","Enter your password":"الرجاء إدخال كلمة المرور","Error":"خطأ","Error at confirm":"خطأ أثناء عملية التأكيد","Error scanning funds:":"حدث خطأ في مسح المبالغ:","Error sweeping wallet:":"حدث خطأ في مسح المحفظة:","Export wallet":"تصدير محفظة","Extracting Wallet information...":"يتم استخراج معلومات المحفظة","Failed to export":"لم نستطع التصدير","Family vacation funds":"صندوق الإجازة السنوية للعائلة","Feedback could not be submitted. Please try again later.":"تعذر إرسال التعليقات. الرجاء معاودة المحاولة في وقت لاحق.","File/Text":"ملف / نص","Filter setting":"فلتر الإعدادات","Finger Scan Failed":"عملية مسح الإصبع فاشلة","Finish":"انهاء","From":"من","Funds found:":"تم العثور على أموال:","Funds transferred":"تم نقل الأموال","Funds will be transferred to":"سيتم تحويل الأموال إلى","Get started":{"button":"البدء"},"Get started by adding your first one.":"ابدأ بإضافة أول ملف.","Go Back":"رجوع","Go back":"رجوع","Got it":"مفهوم","Help & Support":"الدعم والمساعدة","Help and support information is available at the website.":"الدعم والمساعدة متوفرة على موقعنا.","Hide Balance":"إخفاء الرصيد","Home":"الصفحة الرئيسية","How could we improve your experience?":"كيف يمكننا تحسين تجربتك؟","I don't like it":"لا يعجبني","I have read, understood, and agree with the Terms of use.":"لقد قرأت وفهمت وأوافق على شروط الاستخدام.","I like the app":"أنا أحب التطبيق","I think this app is terrible.":"اعتقد أن التطبيق سئ جداً","I understand":"مفهوم","I understand that my funds are held securely on this device, not by a company.":"وأنا أقر أن أموالي محتفظ بها بشكل آمن على هذا الجهاز، وليس من قبل شركة.","I've written it down":"لقد كتبته","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"إذا بدلت الجهاز أو حذفت التطبيق, فلا يمكن إسترجاع أموالك بدون نسخة إحتياطية.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"إذا كانت لديك تعليقات إضافية، فيرجى إخبارنا بذلك عن طريق النقر على خيار \"إرسال تعليقات\" في الإعدادات.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"إذا أخذت لقطة من الشاشة, فيمكن للتطبيقات الأخرى التوصل إليها. من الأفضل كتابتها بإستخدام القلم والورقة.","Import Wallet":"توريد محفظة","Import seed":"توريد نواة (seed)","Import wallet":"توريد محفظة","Importing Wallet...":"جار توريد المحفظة...","In order to verify your wallet backup, please type your password.":"من أجل التأكد من النسخة الإحتياطية للمحفظة, الرجاء إدخال كلمة السر.","Incomplete":"غير مكتمل","Insufficient funds":"الرصيد لا يسمح","Invalid":"لاغ","Is there anything we could do better?":"هل هناك أي شيء يمكننا القيام به بشكل أفضل؟","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"من المهم كتابة النواة (seed) بطريقة سليمة. إذا حدث شئ ما للمحفظة, ستحتاج للنواة لإسترجاعها. تأكد من صحة النواة وحاول مرة أخرى.","Language":"لغة","Learn more":"تعرف على المزيد","Loading transaction info...":"جار تحميل معلومات المعاملات ...","Log options":"خيارات السجل","Makes sense":"واضح","Matches:":"المتطابقات","Meh - it's alright":"لا بأس","Memo":"مذكرة","More Options":"المزيد من الخيارات","Name":"اسم","New account":"حساب جديد","No Account available":"لا يتوفر حساب","No contacts yet":"ليست هناك جهات اتصال حتى الآن","No entries for this log level":"لا توجد إدخالات لمستوى السجل هذا","No recent transactions":"لا توجد معاملات حديثة","No transactions yet":"لا توجد معاملات بعد","No wallet found":"لم يتم العثور على محفظة","No wallet selected":"لم يتم تحديد أي محفظة","No wallets available to receive funds":"لا توجد محافظ متاحة لإستقبال الأموال","Not funds found":"لم يتم العثور على أموال","Not now":"ليس الان","Note":"ملحوظة","Notifications":"إخطارات","Notify me when transactions are confirmed":"أخطرني عندما يتم تأكيد المعاملات","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"الآن هو الوقت المناسب للنسخ الاحتياطي لمحفظتك. إذا تم فقدان هذا الجهاز، فإنه من المستحيل الوصول إلى أموالك دون نسخة احتياطية.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"الآن هو الوقت المثالي لتقييم محيطك. النوافذ القريبة؟ الكاميرات المخفية؟ متطفل من حولك؟","Numbers and letters like 904A2CE76...":"الأرقام والحروف مثل 904A2CE76 ...","OK":"حسنا","OKAY":"حسنا","Official English Disclaimer":"تنويه رسمي باللغة الإنجليزية","Oh no!":"أوه لا!","Open":"افتح","Open GitHub":"افتح موقع جيت هاب","Open GitHub Project":"افتح مشروع في جيت هاب","Open Settings":"أفتح الإعدادات","Open Website":"فتح الموقع","Open website":"فتح الموقع","Paste the backup plain text":"الصق النص للنسخة الاحتياطية","Payment Accepted":"الدفع مقبول","Payment Proposal Created":"اقتراح الدفع المنشئة","Payment Received":"تم استقبال الحوالة","Payment Rejected":"تم رفض الدفعة","Payment Sent":"ارسلت الدفعه","Permanently delete this wallet.":"حذف هذه المحفظة نهائيا.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"يرجى كتابة الــ٦٤ حرفاُ للنواة بعناية. انقر لنسخ إلى الحافظة.","Please connect a camera to get started.":"الرجاء توصيل كاميرا للبدء.","Please enter the seed":"الرجاء إدخال النواة (Seed)","Please, select your backup file":"الرجاء تحديد ملف النسخة الاحتياطية","Preferences":"الإعدادات","Preparing addresses...":"جار تحضير العناوين ...","Preparing backup...":"جار إعداد النسخة الاحتياطية ...","Press again to exit":"اضغط مرة أخرى للخروج","Private Key":"مفتاح خاص","Private key encrypted. Enter password":"المفتاح الخاص مشفر. أدخل كلمة المرور","Push Notifications":"الإخطارات","QR Code":"رمز الـــQR","Quick review!":"مراجعة سريعة!","Rate on the app store":"تقييم في المتجر","Receive":"إستقبال","Received":"تم الاستلام","Recent":"حديث","Recent Transaction Card":"بطاقة المعاملات الحديثة","Recent Transactions":"التحويلات الحديثة","Recipient":"مستفيد","Release information":"معلومات الإصدار","Remove":"إزالة","Restore from backup":"استعادة من النسخة الاحتياطية","Retry":"إعادة المحاولة","Retry Camera":"إعادة محاولة الكاميرا","Save":"حفظ","Scan":"سكان","Scan QR Codes":"سكان لألـــQR","Scan again":"امسح مجددا","Scan your fingerprint please":"امسح بصمات إصبعك من فضلك","Scanning Wallet funds...":"جار مسح أموال المحفظة ...","Screenshots are not secure":"لقطات الشاشة ليست آمنة","Search Transactions":"البحث في المعاملات","Search or enter account number":"ابحث أو أدخل رقم الحساب","Search transactions":"البحث في المعاملات","Search your currency":"ابحث عن عُملتك","Select a backup file":"حدد ملف النسخ الاحتياطي","Select an account":"حدد حساب","Send":"إرسال","Send Feedback":"ارسل رأيك","Send by email":"ارسل بالبريد الإلكترونى","Send from":"ارسل من","Send max amount":"إرسال المبلغ الأقصى","Send us feedback instead":"أرسل لنا تعليقات بدلا من ذلك","Sending":"إرسال","Sending feedback...":"جار إرسال التعليقات ...","Sending maximum amount":"إرسال الحد الأقصى","Sending transaction":"إرسال المعاملة","Sending {{amountStr}} from your {{name}} account":"جار إرسال {{amountStr}} من حسابك {{name}}","Sent":"تم الإرسال","Services":"خدمات","Session Log":"سجل الجلسة","Session log":"سجل الجلسة","Settings":"اعدادات","Share the love by inviting your friends.":"شارك حبك لكانوو. ادع أصدقائك.","Show Account":"اظهر الحساب","Show more":"اظهر المزيد","Signing transaction":"يتم توقيع المعاملة","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"بما أنك المسؤول الوحيد عن أموالك, وجب عليك حفظ نواة (seed) المحفظة, لتتمكن من إسترجاعها في حال فقدان الجهاز.","Skip":"تخطي","Slide to send":"ازلق اصبعك للإرسال","Sweep":"مسح","Sweep paper wallet":"مسح المحفظة الورقية","Sweeping Wallet...":"مسح المحفظة...","THIS ACTION CANNOT BE REVERSED":"لا يمكن عكس هذه العملية!","Tap and hold to show":"انقر وثبت اصبعك للمعاينة","Terms Of Use":"سياسة الإستعمال","Terms of Use":"سياسة الإستعمال","Text":"نص","Thank you!":"شكرا لك!","Thanks!":"شكرا!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"روعة! كنا نود أن نكسب النجمة الخامسة - كيف يمكننا تحسين تجربتك؟","The seed":"النواة (seed)","The seed is invalid, it should be 64 characters of: 0-9, A-F":"النواة (seed) غير صالحة، ينبغي أن تتكون من 64 حرفا من: 0-9، A-F","The wallet server URL":"عنوان خادم المحفظة (URL)","There is an error in the form":"هناك خطأ في النموذج","There's obviously something we're doing wrong.":"من الواضح اننا اخطأنا في شئ ما.","This app is fantastic!":"التطبيق رائع!","Timeline":"الجدول الزمني","To":"الى","Touch ID Failed":"فشلت محاولة اللمس","Transaction":"عملية","Transfer to":"تحويل الى","Transfer to Account":"تحويل الى حساب","Try again in {{expires}}":"إعادة المحاولة في {{expires}}","Uh oh...":"تباً...","Update Available":"تحديث جديد متوفر","Updating... Please stand by":"يتم التحديث... الرجاء الانتظار","Verify your identity":"وثق هويتك","Version":"نسخة","View":"عاين","View Terms of Service":"عاين شروط الخدمة","View Update":"عاين التحديث","Wallet Accounts":"حسابات المحفظة","Wallet File":"ملف المحفظة","Wallet Seed":"نواة المحفظة (seed)","Wallet seed not available":"نواة المحفظة (seed) غير متوفرة","Warning!":"تنبيه","Watch out!":"احذر!","We'd love to do better.":"نتطلع دائما للأفضل.","Website":"الموقع","What do you call this account?":"ماذا تريد أن تسمي هذا الحساب؟","Would you like to receive push notifications about payments?":"هل ترغب في إستقبال إشعارات حول المدفوعات؟","Yes":"نعم","Yes, skip":"نعم, تخطي","You can change the name displayed on this device below.":"يمكنك تغيير الاسم المعروض على هذا الجهاز أدناه.","You can create a backup later from your wallet settings.":"يمكنك إنشاء نسخة احتياطية لاحقا في إعدادات المحفظة.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"يمكنكم متابعة اخر التطورات ودعم هذا التطبيق المفتوح على موقع جيت هاب (Github).","You can still export it from Advanced &gt; Export.":"لا يزال بإمكانك تصديره من إعدادات متقدمة -> تصدير.","You'll receive email notifications about payments sent and received from your wallets.":"سوف يتم تنبيهكم عن طريق البريد الالكتروني عن أي مدفوعات صادرة أو واردة من المحفظة.","Your ideas, feedback, or comments":"مقترحاتكم","Your password":"كلمة مرورك","Your wallet is never saved to cloud storage or standard device backups.":"لا يتم حفظ محفظتك في أي من الخدمات السحابية أو أجهزة النسخ الإحتياطي التقليدية.","[Balance Hidden]":"[الرصيد مخفي]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"لقد قرأت وفهمت وأوافق على <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\"> بنود الاستخدام </a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"تصنيف كانوو بـ٥ نجوم يساعدنا على إيصال التطبيق لأكبر عدد من المستخدمين. وزيادة المستخدمين يزيد من الموارد المتاحة لنا, مما يزيد من تركيزنا على تطوير التطبيق!","At least 8 Characters. Make it good!":"٨ أحرف على الأقل. اجعلها معقدة!","Change Password":"تغيير كلمة السر","Confirm New Password":"تأكيد كلمة المرور الجديدة","How do you like Canoe?":"هل تحب كانوو؟","Let's Start":"لنبدأ","New Password":"كلمة السر الجديدة","Old Password":"كلمة المرور القديمة","One more time.":"مرة أخرى.","Password too short":"كلمة المرور قصيرة جدا","Passwords don't match":"كلمتي المرور غير متطابقة","Passwords match":"كلمتي المرور متطابقة","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"إشعارات كانوو معطلة حالياً. يمكنك تفعيلها في اعدادات التطبيق.","Share Canoe":"شارك كانوو","There is a new version of Canoe available":"هناك نسخة جديدة من كانوو","We're always looking for ways to improve Canoe.":"نحن نبحث دائما عن طرق لتحسين كانوو.","We're always looking for ways to improve Canoe. How could we improve your experience?":"نحن نبحث دائما عن طرق لتحسين كانوو. كيف يمكننا تحسين تجربتك؟","Would you be willing to rate Canoe in the app store?":"هل انت مستعد لتقييم كانوو في المتجر؟","Account Alias":"الاسم المستعار للحساب","Account Color":"لون الحساب","Alias":"الاسم المستعار","Backup seed":"نسخة احتياطية اساسية","Create Wallet":"أنشئ محفظة","Don't see your language? Sign up on POEditor! We'd love to support your language.":"لا يمكنك رؤية لغتك؟ سجل الآن مع POEditor! نسعد بدعم لغتك.","Edit Contact":"تعديل جهة الاتصال","Enter password":"ادخل كلمة المرور.","Incorrect password, try again.":"كلمة المرور خاطئة، أعد المحاولة.","Join the future of money,<br>get started with BCB.":"مستقبل النقود هنا <br> استخدم عملة نانو.","Lock wallet":"اقفل كانوو","No accounts available":"اسم المستخدم غير متوفر.","No backup, no BCB.":"لا يوجد نسخ إحتياطية ، لا يوجد نانو.","Open POEditor":"افتح POEditor","Open Translation Site":"افتح صفحة الترجمة","Please enter a password to use for the wallet":"من فضلك ادخل كلمة المرور لاستخدامها للمحفظة","Repair":"إصلاح","Send BCB":"ارسل نانو","Start sending BCB":"ابدأ بإرسال نانو","To get started, you need BCB. Share your account to receive BCB.":"للبدء, تحتاج لبعضٍ من النانو. قم بإرسال النانو لعنوانك.","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"نبحث دائمًا عن مساهمين في الترجمة! يمكنك التصحيح والمساعدة في جعل هذا البرنامج متاح بلغتك الأم بالإنضمام إلى مجتمعنا في POEditor.","You can scan BCB addresses, payment requests and more.":"يمكنك إجراء سكان لعناوين النانو, وطلبات الدفع والمزيد.","Your Bitcoin Black Betanet Wallet is ready!":"محفظة النانو الخاصة بك جاهزة الان","Account":"حساب","Information":"معلومات","Security Preferences":"خصائص الحماية","Your current password":"كلمة المرور الحالية","Your password has been changed":"تم تغيير كلمة المرور","Caution":"تحذير","Decrypting wallet...":"فك تشفير المحفظة...","Error after loading wallet:":"حدث خطأ اثناء تحميل المحفظة","Just scan and pay.":"اجرِ سكان سريع وادفع","Manage":"ادارة","BCB is Secure":"النانو آمنة","Support":"دعم","Add to address book?":"اضافة الى محفظة العناوين ؟","At least 3 Characters.":"على الاقل ثلاث رموز ","Checking availablity":"تحقق من توفره","Create Alias":"أنشئ اسم مستعار","Do you want to add this new address to your address book?":"هل تريد اضافة هذا العنوان الى محفظة العناوين ؟","Edit your alias.":"تعديل الاسم المستعار.","Email for recovering your alias":"استعادة الاسم المستعار عبر البريد الالكتروني","Error importing wallet:":"حدث خطأ أثناء استيراد المحفظة:","How to buy BCB":"كيف تشتري نانو","How to buy and sell BCB is described at the website.":"كيف يمكنك شراء وبيع نانو التفاصيل في الموقع الالكتروني. ","Invalid Alias!":"الأسم المستعار غير صالح!","Invalid Email!":"بريد إلكتروني غير صالح!","Link my wallet to my phone number.":"اربط محفظتي برقم الهاتف.","Make my alias private.":"أجعل الأسم المستعار خاص.","Refund":"إعادة الأموال","That alias is taken!":"الأسم المستعار مستخدم!","Wallet is Locked":"كانوو مُقفل","Forgot Password?":"نسيت كلمة المرور؟","Fingerprint":"بصمة","Go back to onboarding.":"العودة لخطوة إعادة التثبيت","None":"لا يوجد","Password":"كلمة المرور","Saved":"تم الحفظ","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"العودة لإعادة تثبيت التطبيق سيمسح المحفظة الحالية تماماً. الرجاء التأكد من وجود نسخة إحتياطية تمكنك من إعادة التثبيت. اكتب \"DELETE\" لتأكيد الحذف والعودة لخطوة إعادة التثبيت.","Please enter a password of at least 8 characters":"أدخل ٨ رموز على الأقل","Encryption Time!":"حان وقت التشفير","Enter at least 8 characters to encrypt your wallet.":"أدخل ٨ رموز على الأقل","Password length ok":"طول كلمة المرور كافٍ","Passwords do not match":"كلمتي المرور غير متطابقتين","Unlock":"فتح"});
    gettextCatalog.setStrings('bg', {"A member of the team will review your feedback as soon as possible.":"Член на екипа ще прегледа мнението ви възможно най-скоро.","About":"Относно","Account Information":"Информация за акаунта","Account Name":"Име на акаунт","Account Settings":"Настройки на акаунт","Account name":"Име на акаунт","Accounts":"Акаунти","Add Contact":"Добавяне на контакт","Add account":"Добавяне на акаунт","Add as a contact":"Добавяне като контакт","Add description":"Добавяне на описание","Address Book":"Контакти","Advanced":"Разширени","Advanced Settings":"Разширени настройки","Allow Camera Access":"Позволяване на достъп до камерата","Allow notifications":"Позволяване на известия","Almost done! Let's review.":"Почти е готово! Нека прегледаме.","Alternative Currency":"Алтернативна валута","Amount":"Количество","Are you being watched?":"Наблюдат ли ви?","Are you sure you want to delete this contact?":"Сигурни ли сте, че искате да изтриете този контакт?","Are you sure you want to delete this wallet?":"Сигурни ли сте, че искате да изтриете това портмоне?","Are you sure you want to skip it?":"Сигурни ли сте, че искате да пропуснете?","Backup Needed":"Нужно е резервно копие","Backup now":"Създаване на копие","Backup wallet":"Копие на портмоне","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Уверете се, че запазвате тайния си код на сигурно място. Ако това приложение бъде изтрито или устойството ви - откраднато, този код е единствения начин за възстановяване.","Browser unsupported":"Браузърът не се поддържа","But do not lose your seed!":"Не губете тайния си код!","Buy &amp; Sell Bitcoin":"Купуване &amp; Продаване на Биткойн","Cancel":"Отказ","Cannot Create Wallet":"Не може да се създаде портмоне","Choose a backup file from your computer":"Изберете файл с копие от компютъра ви","Click to send":"Изпращане","Close":"Затваряне","Coin":"Монета","Color":"Цвят","Confirm":"Потвърждение","Confirm &amp; Finish":"Потвърдете &amp; Завършете","Contacts":"Контакти","Continue":"Продъжаване","Contribute Translations":"Помогнете с превод","Copied to clipboard":"Копирано в клипборда","Copy this text as it is to a safe place (notepad or email)":"Копирайте този текст в този му вид (до текстов файл или e-mail)","Copy to clipboard":"Копиране в клипборда","Could not access the wallet at the server. Please check:":"Не получихме достъп до сървъра. Моля, проверете:","Create Account":"Създаване на акаунт","Create new account":"Създаване на нов акаунт","Creating Wallet...":"Създаване на портмоне...","Creating account...":"Създаване на акаунт...","Creating transaction":"Създаване на транзакция","Date":"Дата","Delete":"Изтриване","Delete Account":"Изтриване на акаунт","Delete Wallet":"Изтриване на портмоне","Deleting Wallet...":"Изтриване на портмоне...","Do it later":"Отлагане","Download":"Изтегляне","Edit":"Редактиране","Email":"Email","Email Address":"Email","Export wallet":"Експорт на портмоне","Go Back":"Назад","Go back":"Назад","Got it":"Готово","Help & Support":"Помощ & Поддържка","Hide Balance":"Скриване на баланс","Home":"Начало","I don't like it":"Не ми харесва","I like the app":"Харесвам приложението","I think this app is terrible.":"Мисля, че приложението не става.","I understand":"Разбирам","I've written it down":"Записах си го","Import Wallet":"Импор на портмоне","Import wallet":"Импорт на портмоне","Incomplete":"Недостатъчно","Insufficient funds":"Недостатъчни средства","Invalid":"Невалидно","Language":"Език","Makes sense":"Напълно разбирам","Name":"Име","New account":"Нов акаунт","No contacts yet":"Няма контакти","No transactions yet":"Няма транзакции","No wallet found":"Няма портмонета","No wallet selected":"Няма избрано портмоне","Not funds found":"Няма намерени средства","Not now":"Не сега","Note":"Бележка","Notifications":"Известия","OK":"ОК","OKAY":"ОКЕЙ","Open":"Отваряне","Private Key":"Личен ключ","QR Code":"QR Код","Receive":"Получаване","Received":"Получени","Recent":"Последни","Remove":"Изтриване","Retry":"Повтаряне","Save":"Запазване","Scan":"Сканиране","Scan again":"Повторно сканиране","Send":"Изпращане","Settings":"Настройки","Show Account":"Показване","Warning!":"Предупреждение!","Watch out!":"Внимавайте!","We'd love to do better.":"Ще се радваме да се справим по-добре.\n","Website":"Уебсайт","What do you call this account?":"Как ще именувате този акаунт?","Yes":"Да","Your ideas, feedback, or comments":"Вашите идеи, отзиви или коментари","Your password":"Вашата парола","Change Password":"Смяна на парола","Confirm New Password":"Повторете новата парола","How do you like Canoe?":"Харесвате ли Canoe?","Let's Start":"Нека започнем","New Password":"Нова парола","Old Password":"Стара парола","One more time.":"Още веднъж.","Password too short":"Паролата е прекалено кратка","Passwords don't match":"Паролите не съвпадат","Passwords match":"Паролите съвпадат","Share Canoe":"Споделяне на Canoe","There is a new version of Canoe available":"Има налична нова версия на Canoe","We're always looking for ways to improve Canoe.":"Винаги се стремим да подобряваме Canoe.","Account Alias":"Прякор на акаунта","Account Color":"Цвят на акаунта","Alias":"Прякор","Backup seed":"Таен ключ","Create Wallet":"Създаване на портмоне","Edit Contact":"Редактиране на контакт","Enter password":"Въведете парола","Lock wallet":"Заключване на Canoe","Send BCB":"Изпращане на BCB","Start sending BCB":"Изпращане на BCB","To get started, you need BCB. Share your account to receive BCB.":"За да започнете, се нуждаете от BCB. Споделете акаунта си, за да получите BCB.","Account":"Акаунт","An account already exists with that name":"Акаунт с такова име вече съществува","Confirm your PIN":"Потвърдете PIN","Enter a descriptive name":"Въведете описание","Failed to generate seed QR code":"Грешка при генериране на QR код","Incorrect PIN, try again.":"Грешен PIN, опитайте пак.","Information":"Информация","Not a seed QR code:":"Не е QR код:","Please enter your PIN":"Моля, въведете PIN","Scan this QR code to import seed into another application":"Сканирайте този QR код, за да импортирате ключа до друго приложение","Security Preferences":"Настройки на сигурността","Your current password":"Текуща парола","Your password has been changed":"Паролата ви е сменена","Canoe stores your BCB using cutting-edge security.":"Canoe пази вашите BCB със сигурност от най-висок калибър.","Caution":"Внимание","Decrypting wallet...":"Разшифриране на портмоне...","Error after loading wallet:":"Грешка при зареждане:","Just scan and pay.":"Просто сканирайте и платете.","Manage":"Управление","BCB is Feeless":"При BCB няма такси","BCB is Instant":"С BCB всичко е за секунда","BCB is Secure":"BCB е сигурна валута","Never pay transfer fees again!":"Не плащайте повече такси за трансфер!","Support":"Поддръжка","Transfer BCB instantly to anyone, anywhere.":"Преведете BCB мигновено то всеки, навсякъде.","Account Representative":"Представител на акаунта","Add to address book?":"Добавяне в контакти?","Alias Found!":"Прякорът е намерен!","At least 3 Characters.":"Поне 3 символа.","Create Alias":"Създаване на прякор","Representative":"Представител","Representative changed":"Представителят е сменен","That alias is taken!":"Този прякор е зает!","The official English Terms of Service are available on the Canoe website.":"Официалните правила за ползване са на сайта на Canoe.","View on BCB Block Explorer":"Преглед в BCB Block Explorer","joe.doe@example.com":"иван.иванов@abv.bg","joedoe":"иванов","Wallet is Locked":"Canoe e заключен.","Forgot Password?":"Забравена парола?","Change Lock Settings":"Настройки на влизане","Fingerprint":"Отпечатъци","Go back to onboarding.":"Започнете отначало.","Password":"Парола","Saved":"Запазено","Max":"Макс","delete":"изтриване","bitcoin.black":"bitcoin.black","Confirm Password":"Потвърждаване","Please enter a password of at least 8 characters":"Моля, въведете парола с поне 8 символа"});
    gettextCatalog.setStrings('cs', {"A member of the team will review your feedback as soon as possible.":"Člen týmu posoudí tvůj feed back co nejdříve.","About":"O aplikaci","Account Information":"Informace o účtu","Account Name":"Jméno účtu","Account Settings":"Nastavení účtu","Account name":"Název účtu","Accounts":"Účty","Add Contact":"Přidat účet","Add account":"Přidat účet","Add as a contact":"Přidat kontakt","Add description":"Přidat popis","Address Book":"Seznam adres","Advanced":"Pokročilé","Advanced Settings":"Pokročilé nastavení","Allow Camera Access":"Povolit kameru","Allow notifications":"Povolit oznámení","Almost done! Let's review.":"Téměř vše! Přehled.","Alternative Currency":"Alternativní měny","Amount":"Suma","Are you being watched?":"Nesledoval Vás někdo?","Are you sure you want to delete this contact?":"Jste si jisti, že chcete smazat tento kontakt?","Are you sure you want to delete this wallet?":"Jste si jisti, že chcete zrušit tuto peněženku?","Are you sure you want to skip it?":"Jste si jisti, že chcete toto přeskočit?","Backup Needed":"Nutnost zálohy","Backup now":"Zálohovat nyní","Backup wallet":"Záloha peněženky","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Uchovejte vaše seed na bezpečném místě. Pokud je aplikace smazána/ukradena seed je jediná možnost k obnově peněženky.","Browser unsupported":"Nepodporovaný prohlížeč","But do not lose your seed!":"Ale nezapomeň neztratit seed!","Buy &amp; Sell Bitcoin":"Nákup &amp; Prodej Bitcoin","Cancel":"Zrušit","Cannot Create Wallet":"Nejde vytvořit peněženka","Choose a backup file from your computer":"Najdi soubor zálohy","Click to send":"Klikni a odešli","Close":"Zavřít","Coin":"Mince","Color":"barva","Commit hash":"Schválený hash","Confirm":"Potvrdit","Confirm &amp; Finish":"Potvrď &amp; Dokončit","Contacts":"Kontakty","Continue":"Pokračovat","Contribute Translations":"Pomoc s překladem","Copied to clipboard":"Zkopírováno do clipboardu","Copy this text as it is to a safe place (notepad or email)":"Zkopírujte tento text na bezpečné místo (poznámkový blok, email)","Copy to clipboard":"Kopie do clipboard","Could not access the wallet at the server. Please check:":"Peněženka se nemůže připojit na server. Prosím zkontrolujte:","Create Account":"Vytvořit účet","Create new account":"Vytvořit nový účet","Creating Wallet...":"Vytváření peněženky...","Creating account...":"Vytváření účtu...","Creating transaction":"Vytváření transakce...","Date":"Datum","Default Account":"Základní účet","Delete":"Smazat","Delete Account":"Smazat účet","Delete Wallet":"Smazat peněženku","Deleting Wallet...":"Smazání peněženky...","Do it later":"Později","Donate to Bitcoin Black":"Podpořit Canoe","Download":"Ke stažení","Edit":"Upravit","Email":"Email","Email Address":"Emailová adresa","Enable camera access in your device settings to get started.":"Povolte přístup zařízení ke kameře ať můžete začít.","Enable email notifications":"Povolit upozornění na email","Enable push notifications":"Zapnout upozornění","Enable the camera to get started.":"Zapnout kameru ať můžete začít","Enter amount":"Vyplňte sumu","Enter wallet seed":"Zadejte seed peněženky","Enter your password":"Vyplňte Vaše heslo","Error":"Error","Error at confirm":"Error při potvrzení","Error scanning funds:":"Error skenování zůstatků","Error sweeping wallet:":"Error přepnutí peněženky","Export wallet":"Export peněženky","Extracting Wallet information...":"Získávání informací z peněženky...","Failed to export":"Chyba při exportu","Family vacation funds":"Rodinné prostředky na dovolnou","Feedback could not be submitted. Please try again later.":"Váš názor nebyl potvrzen. Zkuste to prosím znovu.","File/Text":"Soubor/Text","Filter setting":"Nastavení filtrů","Finger Scan Failed":"Sken prstu selhal","Finish":"Dokončeno","From":"Od","Funds found:":"Nalezeny prostředky:","Funds transferred":"Prostředky převedeny","Funds will be transferred to":"Prostředky převedeny na","Get started":{"button":"Začít zde"},"Get started by adding your first one.":"Pojďme začít přidáním prvního.","Go Back":"Zpět","Go back":"Zpět","Got it":"Rozumím","Help & Support":"Pomoc & Podpora","Help and support information is available at the website.":"Podpora a pomoc je dostupná na webových stránkách","Hide Balance":"Schovat zůstatek","Home":"Domů","How could we improve your experience?":"Jak můžeme vylepšit vaše zkušenosti?","I don't like it":"Nelíbí se mi","I have read, understood, and agree with the Terms of use.":"Četl jsem, rozumněl jsem a souhlasím s pravidly o použití.","I like the app":"Libí se mi aplikace","I think this app is terrible.":"Aplikace je strašná","I understand":"Rozumím","I understand that my funds are held securely on this device, not by a company.":"Rozumím, že moje prostředky jsou bezpečně uloženy v zařízení a ne u společnosti.","I've written it down":"Napsal jsem to níže","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Pokud je zařízení změněno, nebo splikace smazána, vaše prostředky nemůžou být obnoveny bez zálohy.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Pokud máte další komentář, prosím dejte nám vědět kliknutím na \"Odeslat konetář\" v možnostech nastavení.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Pokud uděláte screenshot, Vaši zálohu mohou vidět další aplikace. Bezpečnější je obsat zálohu ručně na papír.","Import Wallet":"Importovat peněženku","Import seed":"Importovat seed","Import wallet":"Importovat peněženku","Importing Wallet...":"Importuji peněženku...","In order to verify your wallet backup, please type your password.":"Pro ověření vaší zálohy peněženky prosím napište své heslo.","Incomplete":"Nekompletní","Insufficient funds":"Nedostatečný zůstatek","Invalid":"Chybný","Is there anything we could do better?":"Je zde cokoli co můžeme vylepšit?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Je důležité obsah seed peněženky správně. Pokud se cokoli stane s peněženkou, budete potřebovat seed k její obnově. Prosím zkontrolujte si seed ještě jednou.","Language":"Jazyk","Learn more":"Zjistit více","Loading transaction info...":"Načítání detailu transakce..","Log options":"Možnosti logů","Makes sense":"Dávající smysl","Matches:":"Shoda:","Meh - it's alright":"Hmm - to je v pořádku","Memo":"Poznámky","More Options":"Víze možností","Name":"Jméno","New account":"Nový účet","No Account available":"Žádný dostupný účet","No contacts yet":"Prázdné kontakty","No entries for this log level":"Žádné záznamy pro tento log","No recent transactions":"Žádné nedávné transakce","No transactions yet":"Žádné transakce","No wallet found":"Žádné prostředky v peněžence","No wallet selected":"Nevybrána peněženka","No wallets available to receive funds":"Žádná dostupná peněženka k přijetí platby","Not funds found":"Nenalezeny žádné prostředky","Not now":"Ne nyní","Note":"Poznámka","Notifications":"Upozornění","Notify me when transactions are confirmed":"Upozornit při potvzení transakce","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Nyní je vhodná chvíle k vytvoření zálohy peněženky. Pokud je toto zařízení ztraceno, je nemožné získat přístup k prostředkům bez zálohy.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Nyní je vhodná chvíle zkontrolovat vaše okolí. Poblíž okna? Schované kamery? Zvědavci ? ","Numbers and letters like 904A2CE76...":"Čísla a písmena jako 904A2CE76...","OK":"OK","OKAY":"OK","Official English Disclaimer":"Oficiální vyloučení zodpovědnosti","Oh no!":"Ah ne!","Open":"Otevřít","Open GitHub":"Otevřín GitHub","Open GitHub Project":"Otevřít GitHub projekt","Open Settings":"Otevřít nastavení","Open Website":"Otevřít web stránku","Open website":"Otevřít web stránku","Paste the backup plain text":"Vložte holý text zálohy","Payment Accepted":"Platba přijata","Payment Proposal Created":"Vytvořen platební návrh","Payment Received":"Platba přijata","Payment Rejected":"Platba zamítnuta","Payment Sent":"Platba odeslána","Permanently delete this wallet.":"Trvale smazání peněženky.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Prosím opatrně opiště 64 seed. Klikni ke kopii do schránky.","Please connect a camera to get started.":"Ke startu prosím zapojte kameru.","Please enter the seed":"Prosím zadejte Váš seed","Please, select your backup file":"Prosím označte Váš soubor se zálohou","Preferences":"Volby","Preparing addresses...":"Připravuji adresy...","Preparing backup...":"Připravuji zálohu...","Press again to exit":"Zmáčkněte znovu pro exit","Private Key":"Privátní klíč","Private key encrypted. Enter password":"Privátní klíč zašifrován. Zadejte heslo","Push Notifications":"Oznamovací okénko","QR Code":"QR kód","Quick review!":"Krátký přehled","Rate on the app store":"Hodnocení v App Store","Receive":"Přijmout","Received":"Přijato","Recent":"Poslední","Recent Transaction Card":"Poslední transakce kartou","Recent Transactions":"Poslední transakce","Recipient":"Příjemce","Release information":"Uvolnit informace","Remove":"Odstranit","Restore from backup":"Obnovit ze zálohy","Retry":"Opustit","Retry Camera":"Vypnou kameru","Save":"Uložit","Scan":"Scanovat","Scan QR Codes":"Scan QR kódu","Scan again":"Scanovat znovu","Scan your fingerprint please":"Scan prstu prosím","Scanning Wallet funds...":"Skenování prostředku peněženky...","Screenshots are not secure":"Screenshot není bezbečný","Search Transactions":"Hledejte transakce","Search or enter account number":"Hledat nebo vložit číslo účtu","Search transactions":"Hledat transakce","Search your currency":"Hledat Vaši měnu","Select a backup file":"Označte soubor zálohy","Select an account":"Vybrat účet","Send":"Poslat","Send Feedback":"Poslat názor","Send by email":"Poslat přes email","Send from":"Pošli z","Send max amount":"Poslat max. částku","Send us feedback instead":"Pošlete nám raději Váš názor","Sending":"Posílání","Sending feedback...":"Posílání názoru","Sending maximum amount":"Posílání max. částky","Sending transaction":"Posílání transakce","Sending {{amountStr}} from your {{name}} account":"Odesílání {{amountStr}} z {{name}} účtu","Sent":"Odesláno","Services":"Servis","Session Log":"Log historie","Session log":"Log historie","Settings":"Nastavení","Share the love by inviting your friends.":"Sdílejte lásku pozváním přátel","Show Account":"Ukazázat účet","Show more":"Ukázat více","Signing transaction":"Podepisuji transakci","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Jelikož jen Vy máte pod kontrolou své peníze, potřebuje si bezpečně uchovat seed peněženky pro případnou obnovu.","Skip":"Skok","Slide to send":"Táhnout a odeslat","Sweep":"Vyprázdnit","Sweep paper wallet":"Vyprazdňuji papírovou peněženku..","Sweeping Wallet...":"Vyprazdňuji papírovou peněženku..","THIS ACTION CANNOT BE REVERSED":"TATO AKCE NEMŮŽE BÝT NAVRÁCENA","Tap and hold to show":"Dotkni a vydrž pro náhled","Terms Of Use":"Podmínky použití","Terms of Use":"Podmínky použití","Text":"Text","Thank you!":"Děkujeme!","Thanks!":"Díky!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"To je zajímavé slyšet. Rádi bychom od Vás získali 5 hvězdičkové hodnocení. Cobychom pro to ještě měli udělat?","The seed":"Rychlost","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Seed není správný. Správný obsahuje 64 znaků 0-9, A-F","The wallet server URL":"Server URL peněženky","There is an error in the form":"Chyba ve formuláři","There's obviously something we're doing wrong.":"Očividně něco děláme špatně.","This app is fantastic!":"Aplikace je výborná!","Timeline":"Časová osa","To":"Ke","Touch ID Failed":"Otisk prstu selhal","Transaction":"Transakce","Transfer to":"Přesun do","Transfer to Account":"Přesun na účet","Try again in {{expires}}":"Zkuste znovu {{expires}}","Uh oh...":"Uh oh...","Update Available":"Dostupná aktualizace","Updating... Please stand by":"Aktualizuji...prosím čekejte","Verify your identity":"Potvrďte svou identitu","Version":"Verze","View":"Ukázat","View Terms of Service":"Ukázat podmínky o použití","View Update":"Ukázat aktualizace","Wallet Accounts":"Účty peněženky","Wallet File":"Soubor peněženky","Wallet Seed":"Seed peněženky","Wallet seed not available":"Seed peněženky není dostupný","Warning!":"Varování","Watch out!":"Sledujte!","We'd love to do better.":"Rádi to uděláme lépe.","Website":"Webová stránka","What do you call this account?":"Jak pojmenujete tento účet?","Would you like to receive push notifications about payments?":"Chcete získat upozornění ohledně plateb?","Yes":"Ano","Yes, skip":"Ano, přeskočit","You can change the name displayed on this device below.":"Můžete změnit jméno zobrazené na tomto displeji níže","You can create a backup later from your wallet settings.":"Vytvořit zálohu můžete později v nastavení peněženky.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Můžete vidět poslední vývoj nebo spolupracovat na tomto open source projektu na GitHub.","You can still export it from Advanced &gt; Export.":"Můžete to stále vyexportovat z Nastavení &gt; Export.","You'll receive email notifications about payments sent and received from your wallets.":"Obdržíte email s upozornění o odesláné, nebo přijaté platbě peněženky.","Your ideas, feedback, or comments":"Vaše nápady, myšlenky a komentáře","Your password":"Vaše heslo","Your wallet is never saved to cloud storage or standard device backups.":"Vaše peněženka není nikdy uložena v Cloudu, nebo v běžné záloze zařízení.","[Balance Hidden]":"[Zůstatek schovaný]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Četl jsem, rozumím a souhlasím s <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Podmínky použití</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"5 hvězdičkové hodnocení pomůže dostat Canoe mezi více lidí a pomůže dalšímu rozvoji aplikace.","At least 8 Characters. Make it good!":"Alespoň 8 znaků.","Change Password":"Změna hesla","Confirm New Password":"Potvrďte heslo","How do you like Canoe?":"Jak se Vám líbí Canoe?","Let's Start":"Začít","New Password":"Nové heslo","Old Password":"Staré heslo","One more time.":"Zopakovat","Password too short":"Heslo příliš krátké","Passwords don't match":"Hesla nesouhlasí","Passwords match":"Hesla souhlasí","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Upozornění z Canoe jsou momentálně vypnuté, Zapnout v nastavení aplikace.","Share Canoe":"Sdílet Canoe","There is a new version of Canoe available":"Nové verze Canoe je dostupná","We're always looking for ways to improve Canoe.":"Vždy hledáme způsob jak vylepšit Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Vždy hledáme způsob jak vylepšit Canoe. Jak můžeme využít Vaše zkušenosti?","Would you be willing to rate Canoe in the app store?":"Ohodnotili byste rádi Canoe v app store ? ","Account Alias":"Název účtu","Account Color":"Barva účtu","Alias":"Přezdívka","Backup seed":"Záloha seed","Create Wallet":"Vytvořit peněženku","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Nevidíte svůj jazyk? Přihlašte se na POEditor! Rádi budeme podporovat Váš jazyk.","Edit Contact":"Upravit kontakt","Enter password":"Zadejte heslo","Incorrect password, try again.":"Nesouhlasí heslo, zkuste znovu.","Joe Doe":"Joe Doe","Join the future of money,<br>get started with BCB.":"Přidej se k měně budoucnosti,<br>začni s BCB!","Lock wallet":"Zamkni Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB je jiné &ndash; nemůže být bezpečně uschováno v bance, nebo web servisu.","No accounts available":"Žádné dostupné účty","No backup, no BCB.":"Žádná záloha, žádné BCB.","Open POEditor":"Otevřít POEditor","Open Translation Site":"Otevřít stránku s překlady","Password to decrypt":"Heslo k dešifrování","Password to encrypt":"Heslo k zašifrování","Please enter a password to use for the wallet":"Prosím zadejte heslo pro start peněženky","Repair":"Opravit","Send BCB":"Poslat BCB","Start sending BCB":"Odesílám BCB","To get started, you need BCB. Share your account to receive BCB.":"Abyste začali, potřebujete BCB. Nasdílejte svůj účet k přijímání BCB. ","To get started, you need an Account in your wallet to receive BCB.":"Abyste začali, potřebujete účet, na který příjmete BCB.","Type below to see if an alias is free to use.":"Vyzkoušejte níže zda váš alias je neobsazený.","Use Server Side PoW":"Použít PoW serveru","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Vždy rádi uvítáme spolupráci s překládáním! Můžete pomoci s překlady, nebo opravit chyby připojením se do naší komunity na POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Přihlášením se na POEditor se můžete přidat do komunity překladatelů. Rádi vás tu uvidíme!","You can scan BCB addresses, payment requests and more.":"Můžete scanovat BCB adresy, platební požadavky atd.","Your Bitcoin Black Betanet Wallet is ready!":"Vaše BCB peněženka je připravena!","Your BCB wallet seed is backed up!":"Váš seed BCB peněženky je zálohován!","Account":"Účet","An account already exists with that name":"Účet s tímto jménem již existuje","Confirm your PIN":"Potvrdit PIN","Enter a descriptive name":"Zadejte popis","Failed to generate seed QR code":"Selhalo vytvoření SEED QR kódu","Incorrect PIN, try again.":"Špatný PIN, zkuste znovu","Incorrect code format for a seed:":"Špatný formát SEED kódu","Information":"Informace","Not a seed QR code:":"Ne QR seed kód","Please enter your PIN":"Prosím zadejte Váš PIN","Scan this QR code to import seed into another application":"Oskenujte QR kód k importu seed do další aplikace.","Security Preferences":"Bezpečnostní preference","Your current password":"Vaše aktuální heslo","Your password has been changed":"Vaše bylo změněno","Canoe stores your BCB using cutting-edge security.":"Canoe uchová vaše BCB s vynikající bezpečnostni","Caution":"Pozor","Decrypting wallet...":"Peněženka se dešifruje..","Error after loading wallet:":"Error při načítání peněženky:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Rozumím, že vymazáním aplikace, může být peněženka obnovena pouze se seed, nebo ze zálohy peněženky.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Importováním odstraníte Vaši aktuální peněženku se všemi účty a prostředky. Prvně byste si měli zálohovat Váš aktuální seed, nebo vytvořit zálohu peněženky.","Incorrect code format for an account:":"Nesprávný kód formát pro účet:","Just scan and pay.":"K placení stačí jen sken.","Manage":"Spravovat","BCB is Feeless":"BCB je bez poplatků","BCB is Instant":"BCB je instatní","BCB is Secure":"BCB je bezpečné","Never pay transfer fees again!":"Už nikdy neplaťte transakční poplatky!","Support":"Podpora","Trade BCB for other currencies like USD or Euros.":"Směň BCB s dalšími měnami jako USD nebo EUR.","Transfer BCB instantly to anyone, anywhere.":"Pošli BCB okamžitě komukoli a kdykoli.","Account Representative":"Účet representanta","Add to address book?":"Přidat do adresáře?","Alias Found!":"Alias nalezen!","At least 3 Characters.":"Alespoň 3 znaky.","Checking availablity":"Kontroluji dostupnost","Create Alias":"Vytvořit alias","Creating Alias...":"Vytvářím alias...","Do you want to add this new address to your address book?":"Chcete přidat tuto adresu do adresáře?","Edit your alias.":"Upravit alias.","Editing Alias...":"Upravuji alias...","Email for recovering your alias":"Email pro obnovu vašeho alias","Enter a representative account.":"Vložte adresu representanta.","Error importing wallet:":"Error import peněženky:","How to buy BCB":"Jak koupit BCB","How to buy and sell BCB is described at the website.":"Jak nakoupit a prodat BCB je popsáno na stránkách.","Invalid Alias!":"Nesprávný alias!","Invalid Email!":"Chybný e-mail!","Let People Easily Find you With Aliases":"Alias pomůže přátelům Vás snadno najít.","Link my wallet to my phone number.":"Spojit peněženku s číslem mého telefonu","Looking up @{{addressbookEntry.alias}}":"Vyhledávám @{{addressbookEntry.alias}}","Make my alias private.":"Zapnout privátní alias","Refund":"Vratka","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Oprava Vaši peněženky může chvíli trvat. Bude znovu načten každý blockchain spojen s vaší peněženkou. Jste si jisti, že chcete opravit peněženku?","Representative":"Representant","Representative changed":"Změna representanta","That alias is taken!":"Tento alias je obsazen!","The official English Terms of Service are available on the Canoe website.":"Oficiální aknglické podmínky o servisu jsou dostupné na stránkách Canoe.","Valid Alias & Email":"Platný alias & email","View Block on BCB Block Explorer":"Prohlídnout blok na BCB Block Explorer","View on BCB Block Explorer":"Prohlídnout na BCB Block Explorer","What alias would you like to reserve?":"Jaký alias byste si chtěli rezervovat?","You can change your alias, email, or privacy settings.":"Můžete změnit váš alias, email nebo osobní nastavení.","Your old password was not entered correctly":"Vaše staré heslo nebylo zadáno správně","joe.doe@example.com":"joe.doe@example.com","joedoe":"honzanovak","Wallet is Locked":"Canoe je uzamčeno","Forgot Password?":"Zapomenuté heslo?","4-digit PIN":"4-číselný PIN","Anyone with your seed can access or spend your BCB.":"Kdokoli s Vašim seed má přístup, nebo může utratit Vaše BCB.","Background Behaviour":"Přechod do pozadí","Change 4-digit PIN":"Změna 4 číselného PIN","Change Lock Settings":"Změna nastavení zámku","Fingerprint":"Otisk prstu","Go back to onboarding.":"Obnovit ze zálohy","Hard Lock":"Hard Lock","Hard Timeout":"Pevný časový limit","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Pokud povoleno, důkaz prací (PoW) je delegován na server Canoe. Tato možnost prozatím nelze změnit na mobilní verzi Canoe.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Pokud je zapnuto, list posledních transakcí ze všech peněženek se zobrazí na Hlavním tabu. Zatím není implementováno.","Lock when going to background":"Zamknout při přechodu na pozadí","None":"Ne","Password":"Heslo","Saved":"Uloženo","Soft Lock":"Standby režim","Soft Lock Type":"Standby typ","Soft Timeout":"Soft Timeout","Timeout in seconds":"Časový limit v sekundách","Unrecognized data":"Nerozpoznatelná data","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          S Hard Lock, Canoe zašifruje Vaši peněženku a kompletně ji odstraní z paměti. Režim Hard Lock nemůžete vypnout, ale můžete si nastavit libovolný čas k automatickému uzamčení.","A new version of this app is available. Please update to the latest version.":"Je dostupná nová verze Canoe. Prosím proveďte update.","Backend URL":"Backed URL","Change Backend":"Změnit backend","Change Backend Server":"Změna backend serveru","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Import peněženky odstraní Vaši aktuální peněženku a účty! Pokud máte nějaké prostředky ve své nynější peněžence, ujistěte se, že máte provedenu zálohu pro obnovu. Napiště \"delete\" k potvrzení rozhodnutí smazání Vaši peněženky.","Max":"Max","delete":"Smazat","bitcoin.black":"bitcoin.black","Confirm Password":"Podvrďte heslo","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Přechod zpět na prvotní nastavení odstraní Vaši nynější peněženku i s účty! Pokud zde máte nějaké prostředky, tak se ujistěte, že máte zálohu k jejímu obnovení. Napište \"delete\" pro potvrzení jejího smazání.","Please enter a password of at least 8 characters":"Prosím zadejte heslo s nejméně 8 znaky.","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"Přehled všech Vašich účtů. Podívejte se na <a ng-click=\"openExternalLinkHelp()\">FAQs</a> než začnete!","Play Sounds":"Přehrát zvuk","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">Chování na pozadí</h5>\n            <p translate=\"\">Vyberte způsob uzamčení při kterém jde Canoe do pozadí. Pro vypnutí přechodu do pozadí zvolte Ne.</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":"<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">Se standby zámkem je Canoe uzamčeno, ale data nejsou v paměti zašifrována. Povolením Standby je možné použít jednodušší formy uzamčení jako PIN nebo otisk prstu</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Vyberte způsob uzamčení při kterém jde Canoe do pozadí. Pro vypnutí přechodu do pozadí zvolte Nikdy.","Encryption Time!":"Probíhá šifrování!","Enter at least 8 characters to encrypt your wallet.":"Alespoň 8 znaků k zašifrování peněženky","Password length ok":"Délka hesla ok","Passwords do not match":"Heslo nesouhlasí","Unlock":"Odemknout","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Se standby zámkem je Canoe uzamčeno, ale data nejsou v paměti zašifrována. Povolením Standby zámku je možné použít jednodušší formy uzamčení jako PIN nebo otisk prstu","Attributions":"Attributions","Block was scanned and sent successfully":"Blok naskenován a úspěšně odeslán","Block was scanned but failed to process:":"Blok naskenován ale chyba:","Failed connecting to backend":"Chyba v připojení na backend","Failed connecting to backend, no network?":"Chyba v připojení na backend, žádné připojení?","Successfully connected to backend":"Úspěšně připojeno k backend","BCB Account":"BCB účet","Send BCB to this address":"Poslat BCB na tuto adresu","Please load BCB to donate":"Prosím proveďte vklad BCB pro dotaci Canoe"});
    gettextCatalog.setStrings('da', {"A member of the team will review your feedback as soon as possible.":"Et medlem af holdet vil gennemgå din feedback så hurtigt som muligt.","About":"Om","Account Information":"Kontoinformation","Account Name":"Kontonavn","Account Settings":"Kontoindstillinger","Account name":"Kontonavn","Accounts":"Konti","Add Contact":"Tilføj kontakt","Add account":"Tilføj konto","Add as a contact":"Tilføj som kontakt","Add description":"Tilføj beskrivelse","Address Book":"Adressebog","Advanced":"Avanceret","Advanced Settings":"Avancerede indstillinger","Allow Camera Access":"Tillad brug af kamera","Allow notifications":"Tillad notifikationer","Almost done! Let's review.":"Næsten færdig! Lad os gennemgå.","Alternative Currency":"Alternativ valuta","Amount":"Beløb","Are you being watched?":"Er der nogen, der kigger med?","Are you sure you want to delete this contact?":"Er du sikker på, at du vil slette denne kontakt?","Are you sure you want to delete this wallet?":"Er du sikker på, at du vil slette denne tegnebog?","Are you sure you want to skip it?":"Er du sikker på, at du vil springe dette over?","Backup Needed":"Backup Nødvendig","Backup now":"Backup nu","Backup wallet":"Backup tegnebog","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Sørg for at gemme dit seed på et sikkert sted. Hvis appen slettes, eller din mobil bliver stjålet, er seeden den eneste måde at genskabe tegnebogen på.","Browser unsupported":"Browser ikke supporteret","But do not lose your seed!":"Men mist ikke dit seed!","Cancel":"Annuller","Cannot Create Wallet":"Kan ikke oprette tegnebog","Choose a backup file from your computer":"Vælg en backupfil fra din computer","Click to send":"Klik for at sende","Close":"Luk","Coin":"Mønt","Color":"Farve","Confirm":"Godkend","Contacts":"Kontakter","Continue":"Fortsæt","Copied to clipboard":"Kopieret til udklipsholder","Copy this text as it is to a safe place (notepad or email)":"Kopier denne tekst som den er til et sikkert sted (notesblok eller email)","Copy to clipboard":"Kopier til udklipsholder","Could not access the wallet at the server. Please check:":"Kunne ikke få adgang til tegnebogen på serveren. Kontroller venligst:","Create Account":"Opret konto","Create new account":"Opret ny konto\n","Creating Wallet...":"Opretter tegnebog…","Creating account...":"Opretter konto…","Creating transaction":"Opretter transaktion","Date":"Dato","Default Account":"Standardkonto","Delete":"Slet","Delete Account":"Slet konto","Delete Wallet":"Slet tegnebog","Deleting Wallet...":"Sletter tegnebog…","Do it later":"Gør det senere","Donate to Bitcoin Black":"Donér til Canoe","Download":"Download","Edit":"Rediger","Email":"Email","Email Address":"Emailadresse","Enable camera access in your device settings to get started.":"Tillad kameraadgang i enhedens indstillinger for at komme i gang","Enable email notifications":"Tillad emailmeddelelser","Enable push notifications":"Tillad pushmeddelelser","Enable the camera to get started.":"Tillad kamera for at komme i gang","Enter amount":"Indsæt beløb","Enter wallet seed":"Indtast tegnebogs-seed","Enter your password":"Indtast dit kodeord","Error":"Fejl","Error at confirm":"Fejl ved bekræftelse","Error scanning funds:":"Fejl ved scanning af midler","Export wallet":"Eksporter tegnebog","Extracting Wallet information...":"Anskaffer information om tegnebog","Failed to export":"Fejl i eksportering","Family vacation funds":"Familie ferieopsparing","Feedback could not be submitted. Please try again later.":"Feedback kunne ikke sendes. Prøv venligst igen senere.","File/Text":"Fil/Tekst","Filter setting":"Filterindstilling","Finger Scan Failed":"Fejl ved scanning af finger","Finish":"Afslut","From":"Fra","Funds found:":"Midler fundet:","Funds transferred":"Midler overført","Funds will be transferred to":"Midler vil blive overført til","Get started":{"button":"Kom i gang"},"Get started by adding your first one.":"Kom i gang ved at tilføje din første.","Go Back":"Gå tilbage","Go back":"Gå tilbage","Got it":"Forstået","Help & Support":"Hjælp & Support","Help and support information is available at the website.":"Hjælp og supportinformation er tilgængelig på hjemmesiden.","Hide Balance":"Skjul Balance","Home":"Hjem","How could we improve your experience?":"Hvordan kan vi gøre din oplevelse bedre?","I don't like it":"Jeg kan ikke lide det","I like the app":"Jeg kan godt lide appen","I think this app is terrible.":"Jeg synes denne app er forfærdelig","I understand":"Jeg forstår","I understand that my funds are held securely on this device, not by a company.":"Jeg forstår at mine midler er holdt sikkert på denne enhed, ikke af en virksomhed.","I've written it down":"Jeg har skrevet det ned","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Hvis denne enhed bliver udskiftet eller denne app bliver slettet, kan dine midler ikke gendannes uden en backup.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Hvis du tager et skærmbillede, kan din backup ses af andre apps. Du kan foretage en sikker backup med fysisk papir og en kuglepen.","Import Wallet":"Importer Tegnebog","Import seed":"Importer seed","Import wallet":"Importer tegnebog","Importing Wallet...":"Importerer Tegnebog...","In order to verify your wallet backup, please type your password.":"For at bekræfte din tegnebogs-backup, skal du skrive din adgangskode.","Incomplete":"Ufuldstændig","Invalid":"Ugyldig","Is there anything we could do better?":"Er der noget, vi kan gøre bedre?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Det er vigtigt, at du skriver dit tegnebogs-seed korrekt ned. Hvis der sker noget med din tegnebog, skal du bruge dette seed for at rekonstruere den. Gennemgå dit seed og prøv igen.","Language":"Sprog","Learn more":"Læs mere","Loading transaction info...":"Henter transaktionsinfo…","Log options":"Log muligheder","Makes sense":"Giver mening","Matches:":"Matcher:","Meh - it's alright":"Meh - det er ok","Memo":"Memo","More Options":"Flere indstillinger","Name":"Navn","New account":"Ny konto","No Account available":"Ingen konto tilgængelig","No contacts yet":"Ingen kontakter endnu","No entries for this log level":"Ingen poster for dette logniveau","No recent transactions":"Ingen nylige transaktioner","No transactions yet":"Ingen transaktioner endnu","No wallet found":"Ingen tegnebog fundet","No wallet selected":"Ingen tegnebog valgt","No wallets available to receive funds":"Ingen tegnebøger til rådighed for at modtage midler","Not funds found":"Ingen midler fundet","Not now":"Ikke nu","Note":"Note","Notifications":"Notifikationer","Notify me when transactions are confirmed":"Giv mig besked når transaktioner er bekræftet","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Nu er et godt tidspunkt at sikkerhedskopiere din tegnebog. Hvis denne enhed går tabt, er det umuligt at få adgang til dine midler uden en backup.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Nu er et perfekt tidspunkt til at vurdere dine omgivelser. Vinduer tæt på? Skjulte kameraer? Skulder-kiggere?","Numbers and letters like 904A2CE76...":"Tal og bogstaver som f.eks. 904A2CE76…","OK":"OK","OKAY":"OKAY","Official English Disclaimer":"Officiel engelsk ansvarsfraskrivelse","Oh no!":"Åh nej!","Open":"Åbn","Open GitHub":"Åbn GitHub","Open GitHub Project":"Åbn GitHub Projekt","Open Settings":"Åbn Indstillinger","Open Website":"Åbn Hjemmeside","Open website":"Åbn hjemmeside","Paste the backup plain text":"Indsæt backup almindelig tekst","Payment Accepted":"Betaling accepteret","Payment Proposal Created":"Betalingsanmodning oprettet","Payment Received":"Betaling modtaget","Payment Rejected":"Betaling afvist","Payment Sent":"Betaling sendt","Permanently delete this wallet.":"Slet denne tegnebog permanent.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Skriv omhyggeligt dette 64 karakter seed ned. Klik for at kopiere til udklipsholder.","Please connect a camera to get started.":"Tilslut venligst et kamera for at komme i gang.","Please enter the seed":"Indtast seed","Please, select your backup file":"Vælg din backupfil","Preferences":"Præferencer","Preparing addresses...":"Forbereder addresser…","Preparing backup...":"Forbereder backup…","Press again to exit":"Tryk igen for at afslutte","Private Key":"Privat nøgle","Private key encrypted. Enter password":"Privat nøgle krypteret. Indtast adgangskode","Push Notifications":"Pushmeddelelser","QR Code":"QR-kode","Quick review!":"Hurtig gennemgang!","Rate on the app store":"Bedøm på App Store","Receive":"Modtag","Received":"Modtaget","Recent":"Seneste","Recent Transaction Card":"Seneste transaktion kort","Recent Transactions":"Seneste transaktioner","Recipient":"Modtager","Remove":"Fjern","Restore from backup":"Gendan fra backup","Retry":"Prøv igen","Retry Camera":"Prøv kamera igen","Save":"Gem","Scan":"Scan","Scan QR Codes":"Scan QR koder","Scan again":"Scan igen","Scan your fingerprint please":"Venligst scan dit fingeraftryk","Scanning Wallet funds...":"Scanner tegnebogsmidler","Screenshots are not secure":"Skærmbilleder er ikke sikre","Search Transactions":"Søg transaktioner","Search or enter account number":"Søg eller indtast kontonummer","Search transactions":"Søg transaktioner","Search your currency":"Søg din valuta","Select a backup file":"Vælg en backupfil","Select an account":"Vælg en konto","Send":"Send","Send Feedback":"Send feedback","Send by email":"Send via email","Send from":"Send fra","Send max amount":"Send max beløb","Send us feedback instead":"Send feedback til os i stedet","Sending":"Sender","Sending feedback...":"Sender feedback…","Sending maximum amount":"Sender maksimum beløb","Sending transaction":"Sender transaktion","Sending {{amountStr}} from your {{name}} account":"Sender {{amountStr}} fra din konto ved navn {{name}}","Sent":"Sendt","Services":"Services","Session Log":"Session log","Session log":"Session log","Settings":"Indstillinger","Share the love by inviting your friends.":"Del kærligheden ved at invitere dine venner.","Show Account":"Vis konto","Show more":"Vis mere","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Da kun du kontrollerer dine midler, skal du gemme dit tegnebogs-seed, hvis denne app bliver slettet.","Skip":"Spring over","Slide to send":"Slide for at sende","Sweep":"Sweep","THIS ACTION CANNOT BE REVERSED":"DENNE HANDLING KAN IKKE FORTRYDES","Tap and hold to show":"Tap og hold for at vise","Terms Of Use":"Vilkår for brug","Terms of Use":"Vilkår for brug","Text":"Tekst","Thank you!":"Tak!","Thanks!":"Tak!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Det er spændende at høre. Vi ville elske at gøre os fortjent til den femte stjerne fra dig – hvordan kan vi forbedre din oplevelse?","The seed":"Seed","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Seedet er ugyldigt. Det skal være 64 tegn bestående af: 0-9, A-F","The wallet server URL":"Tegnebogs-server URL","There is an error in the form":"Der er en fejl i formularen","There's obviously something we're doing wrong.":"Der er tydeligvis et eller andet vi gør galt.","This app is fantastic!":"Denne app er fantastisk!","Timeline":"Tidslinje","To":"Til","Touch ID Failed":"Touch ID fejlede","Transaction":"Transaktion","Transfer to":"Overfør til","Transfer to Account":"Overfør til Konto","Try again in {{expires}}":"Prøv igen om {{expires}}","Uh oh...":"Uh oh…","Update Available":"Opdatering tilgængelig","Updating... Please stand by":"Opdaterer… vent venligst","Verify your identity":"Bekræft din identitet","Version":"Version","View":"Se","View Terms of Service":"Se Vilkår for brug","View Update":"Se opdatering","Wallet Accounts":"Tegnebogskonti","Wallet File":"Tegnebogsfil","Wallet Seed":"Tegnebogs-seed","Wallet seed not available":"Tegnebogs-seed ikke tilgængeligt","Warning!":"Advarsel!","Watch out!":"Pas på!","We'd love to do better.":"Vi ville elske at gøre det bedre.","Website":"Hjemmeside","What do you call this account?":"Hvad kalder du denne konto?","Would you like to receive push notifications about payments?":"Vil du modtage pushmeddelelser om betalinger?","Yes":"Ja","Yes, skip":"Ja, spring over","You can change the name displayed on this device below.":"Du kan ændre navnet, der vises på denne enhed, nedenfor.","You can create a backup later from your wallet settings.":"Du kan oprette en backup senere fra dine tegnebogsindstillinger.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Du kan se de seneste udviklinger og bidrage til denne open source app ved at besøge vores projekt på GitHub.","You can still export it from Advanced &gt; Export.":"Du kan stadig eksportere det fra Avanceret &gt; Eksport","You'll receive email notifications about payments sent and received from your wallets.":"Du modtager email-meddelelser om betalinger, der sendes og modtages fra dine tegnebøger.","Your ideas, feedback, or comments":"Dine ideer, feedback eller kommentarer","Your password":"Din adgangskode","Your wallet is never saved to cloud storage or standard device backups.":"Din tegnebog lagres aldrig i skyen eller i dine enheds-backups.","[Balance Hidden]":"[Balance skjult]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Jeg har læst, forstået og accepterer <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Vilkår for brug</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"5-stjernede ratings hjælper os med at få Canoe i flere hænder, og flere brugere betyder at flere ressourcer kan tildeles til appen!","At least 8 Characters. Make it good!":"Mindst 8 karakterer. Lav et godt ét!","Change Password":"Skift adgangskode","Confirm New Password":"Bekræft ny adgangskode","How do you like Canoe?":"Hvad synes du om Canoe?","Let's Start":"Lad os begynde","New Password":"Ny adgangskode","Old Password":"Gammel adgangskode","One more time.":"En gang til.","Password too short":"Adgangskode for kort","Passwords don't match":"Adgangskoder matcher ikke","Passwords match":"Adgangskoder matcher","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Push-meddelelser for Canoe er i øjeblikket ikke slået til. Slå dem til i appen Indstillinger.","Share Canoe":"Del Canoe","There is a new version of Canoe available":"Der er en ny opdatering til Canoe","We're always looking for ways to improve Canoe.":"Vi er altid på udkig efter måder at forbedre Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Vi er altid på udkig efter måder at forbedre Canoe. Hvordan kunne vi forbedre din oplevelse?","Would you be willing to rate Canoe in the app store?":"Vil du være villig til at bedømme Canoe i App Store?","Account Alias":"Kontoalias","Account Color":"Kontofarve","Alias":"Alias","Backup seed":"Backup-seed","Create Wallet":"Opret tegnebog","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Kan du ikke se dit sprog? Tilmeld dig POEditor! Vi vil gerne understøtte dit sprog.","Edit Contact":"Rediger kontakt","Enter password":"Indtast adgangskode","Incorrect password, try again.":"Forkert adgangskode, prøv igen.","Joe Doe":"Joe Doe","Join the future of money,<br>get started with BCB.":"Deltag i fremtiden for penge,<br>kom i gang med BCB.","Lock wallet":"Lås Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB er anderledes &ndash; det kan ikke gemmes i en bank eller hos en webservice.","No accounts available":"Ingen konti tilgængelige","No backup, no BCB.":"Ingen backup, ingen BCB.","Open POEditor":"Åbn POEditor","Open Translation Site":"Åbn oversættelses-site","Password to decrypt":"Adgangskode til at dekryptere","Password to encrypt":"Adgangskode til at kryptere","Please enter a password to use for the wallet":"Indtast venligst en adgangskode der skal bruges til tegnebogen","Repair":"Reparer","Send BCB":"Send BCB","Start sending BCB":"Begynd at sende BCB","To get started, you need BCB. Share your account to receive BCB.":"For at komme i gang har du brug for BCB. Del din konto for at modtage BCB.","To get started, you need an Account in your wallet to receive BCB.":"For at komme i gang har du brug for en konto i din tegnebog til at modtage BCB.","Type below to see if an alias is free to use.":"Skriv nedenfor for at se om et alias er tilgængeligt.","Use Server Side PoW":"Brug Server Side PoW","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Vi leder altid efter bidrag til oversættelser! Du kan foretage korrektioner eller hjælpe med at gøre denne app tilgængelig på dit modersmål ved at tilmelde dig vores fællesskab på POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Du kan yde bidrag ved at tilmelde dig vores oversættelsesprojekt på POEditor. Vi ser frem til at høre fra dig!","You can scan BCB addresses, payment requests and more.":"Du kan scanne BCB-adresser, betalingsanmodninger og mere.","Your Bitcoin Black Betanet Wallet is ready!":"Din BCB tegnebog er klar!","Your BCB wallet seed is backed up!":"Dit BCB tegnebogs-seed er sikkerhedskopieret!","Account":"Konto","An account already exists with that name":"En konto med det navn eksisterer allerede","Confirm your PIN":"Bekræft din PIN","Enter a descriptive name":"Indtast et beskrivende navn","Failed to generate seed QR code":"Kunne ikke generere seed QR-kode","Incorrect PIN, try again.":"Forkert PIN, prøv igen.","Incorrect code format for a seed:":"Forkert kodeformat for et seed:","Information":"Information","Not a seed QR code:":"Ikke en seed QR-kode:","Please enter your PIN":"Indtast venlist din PIN","Scan this QR code to import seed into another application":"Scan denne QR-kode for at importere dette seed i en anden applikation","Security Preferences":"Sikkerhedspræferencer","Your current password":"Din nuværende adgangskode","Your password has been changed":"Din adgangskode er blevet ændret","Canoe stores your BCB using cutting-edge security.":"Canoe gemmer din BCB ved brug af banebrydende sikkerhed.","Caution":"Forsigtig","Decrypting wallet...":"Dekrypterer tegnebog…","Error after loading wallet:":"Fejl efter indlæsning af tegnebog:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Jeg forstår at hvis denne app slettes, kan min tegnebog kun gendannes med seedet eller en tegnebogs backup.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Import af en tegnebog fjerner din nuværende tegnebog og alle dens konti. Du vil muligvis først sikkerhedskopiere dit nuværende seed eller lave en sikkerhedskopi af tegnebogen.","Incorrect code format for an account:":"Forkert kodeformat for en konto:","Just scan and pay.":"Bare scan og betal.","BCB is Feeless":"BCB er gebyrfri","BCB is Instant":"BCB er øjeblikkelig","BCB is Secure":"BCB er sikker","Never pay transfer fees again!":"Betal aldrig overførselsgebyrer igen!","Support":"Support","Trade BCB for other currencies like USD or Euros.":"Køb BCB for andre valutaer som USD eller Euro.","Transfer BCB instantly to anyone, anywhere.":"Overfør BCB øjeblikkeligt til hvem som helst, hvor som helst.","Account Representative":"Kontorepræsentant","Add to address book?":"Tilføj til adressebog?","Alias Found!":"Alias fundet!","At least 3 Characters.":"Mindst 3 karakterer.","Checking availablity":"Kontrollerer tilgængelighed","Create Alias":"Opret alias","Creating Alias...":"Opretter alias…","Do you want to add this new address to your address book?":"Vil du gemme denne nye adresse i din adressebog?","Edit your alias.":"Rediger dit alias.","Editing Alias...":"Redigerer alias…","Email for recovering your alias":"Email til at gendanne dit alias","Enter a representative account.":"Indtast en repræsentantkonto.","Error importing wallet:":"Fejl ved import af tegnebog:","How to buy BCB":"Sådan køber du BCB","How to buy and sell BCB is described at the website.":"Hvordan du køber og sælger BCB er beskrevet på hjemmesiden.","Invalid Alias!":"Ugyldigt alias!","Invalid Email!":"Ugyldig email!","Let People Easily Find you With Aliases":"Lad folk finde dig nemt med aliaser.","Link my wallet to my phone number.":"Forbind min tegnebog med mit telefonnummer.","Looking up @{{addressbookEntry.alias}}":"Slår @{{addressbookEntry.alias}} op","Make my alias private.":"Lav mit alias privat.","Refund":"Tilbagebetaling","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Det kan tage lidt tid at reparere din tegnebog. Dette vil genindlæse alle blokke, der er knyttet til din tegnebog. Er du sikker på, at du vil fortsætte?","Representative":"Repræsentant","Representative changed":"Repræsentant ændret","That alias is taken!":"Det alias er allerede taget!","The official English Terms of Service are available on the Canoe website.":"De officielle engelske servicevilkår er tilgængelige på Canoes hjemmeside.","Valid Alias & Email":"Gyldigt alias & email","View Block on BCB Block Explorer":"Se blok på BCB Block Explorer","View on BCB Block Explorer":"Se på BCB Block Explorer","What alias would you like to reserve?":"Hvilket alias vil du gerne reservere?","You can change your alias, email, or privacy settings.":"Du kan ændre dit alias, email eller privatlivsindstillinger.","Your old password was not entered correctly":"Din gamle adgangskode var ikke indtastet korrekt","joe.doe@example.com":"joe.doe@example.com","joedoe":"joedoe","Wallet is Locked":"Canoe er låst","Forgot Password?":"Glemt adgangskode?","4-digit PIN":"4-cifret PIN","Anyone with your seed can access or spend your BCB.":"Alle med dit seed kan få adgang til og bruge din BCB.","Background Behaviour":"Baggrundsadfærd","Change 4-digit PIN":"Skift 4-cifret PIN","Change Lock Settings":"Skift låseindstillinger","Fingerprint":"Fingeraftryk","Go back to onboarding.":"Gå tilbage til introforløb.","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Hvis aktiveret, er Proof of Work delegeret til Canoe serveren. Denne mulighed er deaktiveret og altid slået til på mobil Canoe for nu.","Lock when going to background":"Lås når Canoe sendes til baggrunden","None":"Ingen","Password":"Adgangskode","Saved":"Gemt","Timeout in seconds":"Timeout i sekunder","Unrecognized data":"Ukendt data","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          Med Hard Lock krypterer Canoe din tegnebog og fjerner den helt fra hukommelsen. Du kan ikke slå Hard Lock fra, men du kan sætte en høj timeout-værdi.","A new version of this app is available. Please update to the latest version.":"En ny version af denne app er tilgængelig. Opdater venligst til den seneste version.","Backend URL":"Backend URL","Change Backend":"Skift backend","Change Backend Server":"Skift backend server","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Hvis du importerer en tegnebog, fjernes din eksisterende tegnebog og konti! Hvis du har midler i din nuværende tegnebog, skal du sørge for, at du har en sikkerhedskopi at gendanne fra. Skriv \"slet\" for at bekræfte, at du ønsker at slette din nuværende tegnebog.","Max":"Max","delete":"slet","bitcoin.black":"bitcoin.black","Confirm Password":"Bekræft adgangskode","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Hvis du går tilbage til introforløbet fjernes din eksisterende tegnebog og konti! Hvis du har midler i din nuværende tegnebog, skal du sørge for, at du har en sikkerhedskopi at gendanne fra. Skriv \"slet\" for at bekræfte, at du ønsker at slette din nuværende tegnebog.","Please enter a password of at least 8 characters":"Indtast venligst en adgangskode på mindst 8 karakterer"});
    gettextCatalog.setStrings('de', {"A member of the team will review your feedback as soon as possible.":"Ein Teammitglied wird dein Feedback so bald wie möglich überprüfen.","About":"Über","Account Information":"Kontodetails","Account Name":"Kontoname","Account Settings":"Kontoeinstellungen","Account name":"Kontoname","Accounts":"Konten","Add Contact":"Kontakt hinzufügen","Add account":"Konto hinzufügen","Add as a contact":"Als Kontakt hinzufügen","Add description":"Beschreibung hinzufügen","Address Book":"Addressbuch","Advanced":"Erweitert","Advanced Settings":"Erweiterte Einstellungen","Allow Camera Access":"Kamerazugriff erlauben","Allow notifications":"Benachrichtigungen erlauben","Almost done! Let's review.":"Fast fertig! Fassen wir zusammen.","Alternative Currency":"Alternative Währung","Amount":"Betrag","Are you being watched?":"Wirst du beobachtet?\n","Are you sure you want to delete this contact?":"Willst du diesen Kontakt wirklich löschen?","Are you sure you want to delete this wallet?":"Soll das Wallet wirklich gelöscht werden?","Are you sure you want to skip it?":"Bist du dir sicher, dass du es überspringen möchtest?","Backup Needed":"Sicherung benötigt","Backup now":"Jetzt sichern","Backup wallet":"Sicherung des Wallets","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Bewahre deinen Seed an einem sicheren Ort auf. Sollte diese App gelöscht oder dein Gerät gestohlen werden, kann das Wallet nur mit dem Seed wiederhergestellt werden.","Browser unsupported":"Browser wird nicht unterstützt","But do not lose your seed!":"Aber verliere nicht deinen Seed!","Buy &amp; Sell Bitcoin":"Kaufe &amp; Verkaufe Bitcoins","Cancel":"Abbruch","Cannot Create Wallet":"Wallet kann nicht erstellt werden","Choose a backup file from your computer":"Wähle eine Sicherungsdatei vom Computer","Click to send":"Klicke zum Senden","Close":"Schließen","Coin":"Coin","Color":"Farbe","Commit hash":"Github Commit-Hash","Confirm":"Bestätigen","Confirm &amp; Finish":"Bestätigen &amp; Beenden","Contacts":"Kontakte","Continue":"Weiter","Contribute Translations":"Übersetzungen beitragen","Copied to clipboard":"Adresse in Zwischenablage kopiert","Copy this text as it is to a safe place (notepad or email)":"Kopiere diesen Text an einen sicheren Ort (Notepad oder E-Mail)","Copy to clipboard":"In die Zwischenablage kopieren","Could not access the wallet at the server. Please check:":"Kein Zugriff auf das Wallet des Servers. Überprüfe bitte:","Create Account":"Konto erstellen","Create new account":"Neues Konto erstellen","Creating Wallet...":"Wallet wird erstellt...","Creating account...":"Konto wird erstellt....","Creating transaction":"Transaktion wird erstellt","Date":"Datum","Default Account":"Standardkonto","Delete":"Löschen","Delete Account":"Konto löschen","Delete Wallet":"Wallet löschen","Deleting Wallet...":"Wallet wird gelöscht...","Do it later":"Später erledigen","Donate to Bitcoin Black":"Spende an Canoe senden","Download":"Herunterladen","Edit":"Bearbeiten","Email":"E-Mail","Email Address":"E-Mail-Adresse","Enable camera access in your device settings to get started.":"Aktiviere den Kamerazugriff in deinen Geräteeinstellungen.","Enable email notifications":"E-Mail-Benachrichtigungen aktivieren","Enable push notifications":"Pushbenachrichtigungen aktivieren","Enable the camera to get started.":"Aktiviere die Kamera, um loszulegen.","Enter amount":"Betrag eingeben","Enter wallet seed":"Seed eingeben","Enter your password":"Passwort eingeben","Error":"Fehler","Error at confirm":"Fehler beim Bestätigen","Error scanning funds:":"Fehler bei der Ermittlung des Guthabens:","Error sweeping wallet:":"Fehler beim Leeren des Wallets:","Export wallet":"Wallet exportieren","Extracting Wallet information...":"Wallet-Details werden extrahiert ...","Failed to export":"Fehler beim Exportieren","Family vacation funds":"Familienurlaub","Feedback could not be submitted. Please try again later.":"Feedback konnte nicht abgeschickt werden. Bitte versuche es später erneut.","File/Text":"Datei/Text","Filter setting":"Filtereinstellungen","Finger Scan Failed":"Fingerabdruckscan gescheitert","Finish":"Beenden","From":"Von","Funds found:":"Betrag gefunden:","Funds transferred":"Betrag übermittelt","Funds will be transferred to":"Betrag wird überwiesen an","Get started":{"button":"Loslegen"},"Get started by adding your first one.":"Starte, indem du dein erstes hinzufügst.","Go Back":"Zurück","Go back":"Zurück","Got it":"Habe verstanden","Help & Support":"Hilfe & Support","Help and support information is available at the website.":"Hilfe und Support-Informationen gibt es auf der Website.","Hide Balance":"Guthaben verstecken","Home":"Start","How could we improve your experience?":"Wie können wir deine Zufriedenheit steigern?","I don't like it":"Das gefällt mir nicht","I have read, understood, and agree with the Terms of use.":"Ich habe die Nutzungsbedingungen gelesen und stimme ihnen zu.","I like the app":"Mir gefällt die App","I think this app is terrible.":"Diese App ist furchtbar.","I understand":"Ich verstehe","I understand that my funds are held securely on this device, not by a company.":"Ich verstehe, dass mein Guthaben nur lokal diesem Gerät und nicht bei einem Unternehmen gesichert wird.","I've written it down":"Ich habe ihn aufgeschrieben","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Wenn du dieses Gerät verlierst oder die App gelöscht wird, kannst du den Zugriff auf dein Guthaben nur mit dem Seed wiederherstellen.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Teile uns dein zusätzliches Feedback mit, indem du auf die Option \"Feedback senden\" in der Registerkarte \"Einstellungen\" klickst.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Wenn du einen Screenshot erstellst, können andere Apps darauf zugreifen. Ein sicheres Backup kannst Du mit Papier und Stift erstellen.","Import Wallet":"Wallet importieren","Import seed":"Seed importieren","Import wallet":"Wallet importieren","Importing Wallet...":"Wallet wird importiert ...","In order to verify your wallet backup, please type your password.":"Um die Sicherung des Wallets zu überprüfen, gib bitte dein Passwort ein.","Incomplete":"Unvollständig","Insufficient funds":"Nicht ausreichendes Guthaben","Invalid":"Ungültig","Is there anything we could do better?":"Gibt es etwas, das wir besser machen können?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Es ist wichtig, dass du deinen Seed fehlerfrei aufschreibst. Falls deinem Wallet etwas passiert, kannst du es nur mit dem Seed wiederherstellen. Bitte überprüfe deine Eingabe und versuche es erneut.","Language":"Sprache","Learn more":"Mehr erfahren","Loading transaction info...":"Transaktionen werden geladen ...","Log options":"Log Optionen","Makes sense":"Macht Sinn","Matches:":"Übereinstimmungen:","Meh - it's alright":"Meh - ist in Ordnung","Memo":"Notiz","More Options":"Weitere Optionen","Name":"Name","New account":"Neues Konto","No Account available":"Kein Konto vorhanden","No contacts yet":"Noch keine Kontakte","No entries for this log level":"Keine Einträge auf dieser Protokollebene","No recent transactions":"Keine kürzlich ausgeführten Transaktionen","No transactions yet":"Noch keine Transaktionen","No wallet found":"Kein Wallet gefunden","No wallet selected":"Kein Wallet ausgewählt","No wallets available to receive funds":"Kein Wallet verfügbar, um Guthaben zu erhalten","Not funds found":"Kein Guthaben gefunden","Not now":"Nicht jetzt","Note":"Notiz","Notifications":"Benachrichtigungen","Notify me when transactions are confirmed":"Benachrichtige mich, sobald die Transaktionen bestätigt sind","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Jetzt ist ein guter Zeitpunkt, um dein Wallet zu sichern. Wenn das Gerät verloren geht, ist es unmöglich, ohne eine Sicherung auf dein Guthaben zuzugreifen.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Jetzt ist die perfekte Zeit, um deine Umgebung zu überprüfen. Bist du in der Nähe eines Fensters? Versteckte Kameras? Schulter-Spione?","Numbers and letters like 904A2CE76...":"Ziffern und Buchstaben wie 904A2CE76 ...","OK":"OK","OKAY":"Okay","Official English Disclaimer":"Offizieller englischer Haftungsausschluss","Oh no!":"Oh nein!","Open":"Öffnen","Open GitHub":"Öffne GitHub","Open GitHub Project":"Öffne GitHub-Projekt","Open Settings":"Öffne Einstellungen","Open Website":"Öffne Webseite","Open website":"Öffne Webeite","Paste the backup plain text":"Backup im Textformat einfügen","Payment Accepted":"Zahlung akzeptiert","Payment Proposal Created":"Zahlungsvorschlag erstellt","Payment Received":"Zahlung erhalten","Payment Rejected":"Zahlung abgelehnt","Payment Sent":"Zahlung gesendet","Permanently delete this wallet.":"Wallet dauerhaft löschen.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Schreibe den 64-stelligen Seed sorgfältig auf. Klicke, um ihn der Zwischenablage hinzuzufügen.","Please connect a camera to get started.":"Bitte verbinde eine Kamera, um loszulegen.","Please enter the seed":"Gib deinen Seed ein","Please, select your backup file":"Wähle deine Sicherungsdatei","Preferences":"Einstellungen","Preparing addresses...":"Adressen werden vorbereitet ...","Preparing backup...":"Sicherung wird vorbereitet ...","Press again to exit":"Zum Beenden erneut drücken","Private Key":"Privater Schlüssel","Private key encrypted. Enter password":"Privater Schlüssel verschlüsselt. Passwort eingeben","Push Notifications":"Push-Benachrichtigungen","QR Code":"QR-Code","Quick review!":"Schnelle Überprüfung!","Rate on the app store":"Im App Store bewerten","Receive":"Empfangen","Received":"Empfangen","Recent":"Kürzlich","Recent Transaction Card":"Kürzlich ausgeführte Transaktionen","Recent Transactions":"Kürzlich ausgeführte Transaktionen","Recipient":"Empfänger","Release information":"Release-Informationen","Remove":"Entfernen","Restore from backup":"Aus Sicherung wiederherstellen","Retry":"Nochmals versuchen","Retry Camera":"Kamera nochmals versuchen","Save":"Speichern","Scan":"Scannen","Scan QR Codes":"QR-Code scannen","Scan again":"Scanne erneut","Scan your fingerprint please":"Scanne bitte deinen Fingerabdruck","Scanning Wallet funds...":"Prüfe Wallet auf neue Beträge ...","Screenshots are not secure":"Screenshots sind nicht sicher","Search Transactions":"Transaktionen durchsuchen","Search or enter account number":"Suche nach einer Adresse","Search transactions":"Transaktionen durchsuchen","Search your currency":"Suche deine Währung","Select a backup file":"Eine Sicherungsdatei auswählen","Select an account":"Wähle ein Konto","Send":"Senden","Send Feedback":"Feedback senden","Send by email":"Per E-Mail versenden","Send from":"Senden von","Send max amount":"Sende max. Betrag","Send us feedback instead":"Sende uns Feedback stattdessen","Sending":"Senden","Sending feedback...":"Feedback wird gesendet...","Sending maximum amount":"Sende maximalen Betrag","Sending transaction":"Sende Transaktion","Sending {{amountStr}} from your {{name}} account":"Sende {{amountStr}} vom Konto {{name}}","Sent":"Gesendet","Services":"Dienste","Session Log":"Sitzungsprotokoll","Session log":"Sitzungsprotokoll","Settings":"Einstellungen","Share the love by inviting your friends.":"Teile die Liebe, indem du deine Freunde einlädst.","Show Account":"Zeige mir meine Adresse","Show more":"Mehr anzeigen","Signing transaction":"Signiere Transaktion","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Da nur die die Kontrolle über dein Guthaben hast, solltest du deinen Wallet-Seed sichern.","Skip":"Überspringen","Slide to send":"Wischen um zu senden","Sweep":"Leeren","Sweep paper wallet":"Papierwallet löschen","Sweeping Wallet...":"Leere Wallet...","THIS ACTION CANNOT BE REVERSED":"DIESE AKTION KANN NICHT RÜCKGÄNGIG GEMACHT WERDEN","Tap and hold to show":"Anzeigen durch Tippen und Halten","Terms Of Use":"Nutzungsbedingungen","Terms of Use":"Nutzungsbedingungen","Text":"Text","Thank you!":"Vielen Dank!","Thanks!":"Danke!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Wir sind gespannt es zu erfahren. Wir würden uns freuen fünf Sterne von Ihnen zu erhalten - Wie können wir Ihre Erfahrung verbessern?","The seed":"Der Seed","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Seed ist ungültig. Er sollte 64 Stellen lang sein und nur aus 0-9, A-F bestehen","The wallet server URL":"Die Wallet-Server-URL","There is an error in the form":"Es ist ein Fehler im Formular aufgetreten","There's obviously something we're doing wrong.":"Hier ist offensichtlich etwas was wir falsch machen.","This app is fantastic!":"Diese App ist fantastisch!","Timeline":"Zeitachse","To":"An","Touch ID Failed":"Touch-ID gescheitert","Transaction":"Transaktion","Transfer to":"Senden an","Transfer to Account":"Senden an Konto","Try again in {{expires}}":"Versuche es erneut in {{expires}}","Uh oh...":"Oh oh...","Update Available":"Aktualisierung verfügbar","Updating... Please stand by":"Aktualisiere... Bitte warten","Verify your identity":"Bestätige deine Identität","Version":"Version","View":"Ansicht","View Terms of Service":"Nutzungsbedingungen anzeigen","View Update":"Aktualisierungen anzeigen","Wallet Accounts":"Wallet-Konten","Wallet File":"Wallet-Datei","Wallet Seed":"Wallet-Seed","Wallet seed not available":"Wallet-Seed nicht verfügbar","Warning!":"Warnung!","Watch out!":"Aufgepasst!","We'd love to do better.":"Wir würden es gerne besser machen.","Website":"Webseite","What do you call this account?":"Wie soll dieses Konto heißen?","Would you like to receive push notifications about payments?":"Möchtest du Push-Benachrichtigungen über Zahlungen erhalten?","Yes":"Ja","Yes, skip":"Ja, überspringen","You can change the name displayed on this device below.":"Du kannst den Anzeigenamen dieses Geräts nachfolgend ändern.","You can create a backup later from your wallet settings.":"Du kannst später eine Sicherung über deine Wallet-Einstellungen erstellen.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Sie können auf GitHub die neuesten Entwicklungen ansehen und zu dieser Open-Source App beitragen.","You can still export it from Advanced &gt; Export.":"Sie können es auch exportieren aus dem Erweiterten &gt; Export.","You'll receive email notifications about payments sent and received from your wallets.":"Du erhältst E-Mail-Benachrichtigungen über gesendete und empfangene Zahlungen deiner Wallets.","Your ideas, feedback, or comments":"Ihre Ideen, Feedback oder Kommentare","Your password":"Dein Passwort","Your wallet is never saved to cloud storage or standard device backups.":"Dein Wallet wird nie auf einem Cloud-Speicher oder einem Standard-Geräte-Backup gespeichert.","[Balance Hidden]":"[Guthaben versteckt]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Ich habe die <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\"> Nutzungsbedingungen</a> gelesen, verstanden und stimme ihnen zu.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"5-Sterne-Bewertungen helfen uns dabei, mehr Nutzer zu bekommen. Dies erlaubt es uns, mehr Ressourcen für die Entwicklung der App einzusetzen!","At least 8 Characters. Make it good!":"Mindestens 8 Buchstaben. Wähle sie sorgfältig!","Change Password":"Passwort ändern","Confirm New Password":"Neues Passwort bestätigen","How do you like Canoe?":"Wie findest du Canoe?","Let's Start":"Los geht's","New Password":"Neues Passwort","Old Password":"Bisheriges Passwort","One more time.":"Noch einmal.","Password too short":"Passwort zu kurz","Passwords don't match":"Passwörter stimmen nicht überein","Passwords match":"Passwörter stimmen überein","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Push-Benachrichtigungen sind derzeit deaktiviert. Aktiviere sie in der App \"Einstellungen\".","Share Canoe":"Teile Canoe","There is a new version of Canoe available":"Eine neue Version von Canoe ist verfügbar","We're always looking for ways to improve Canoe.":"Wir sind immer auf der Suche nach Verbesserungen für Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Wir sind immer auf der Suche nach Verbesserungen für Canoe. Wie könnten wir die Nutzererfahrung verbessern?","Would you be willing to rate Canoe in the app store?":"Würdest du Canoe im App Store bewerten?","Account Alias":"Kontoname","Account Color":"Kontofarbe","Alias":"Alias","Backup seed":"Seed sichern","Create Wallet":"Wallet erstellen","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Deine Sprache wird nicht unterstützt? Registriere dich jetzt auf POEditor!","Edit Contact":"Kontakt bearbeiten","Enter password":"Gib dein Passwort ein","Incorrect password, try again.":"Falsches Passwort, versuche es bitte erneut.","Joe Doe":"Max Mustermann","Join the future of money,<br>get started with BCB.":"Entdecke BCB,<br>das Zahlungsmittel der Zukunft.","Lock wallet":"Canoe sperren","BCB is different – it cannot be safely held with a bank or web service.":"BCB ist anders &ndash; es kann nicht sicher bei einer Bank oder einem Internetdienst aufbewahrt werden.","No accounts available":"Keine Konten verfügbar","No backup, no BCB.":"Kein Backup, keine Nanos.","Open POEditor":"Öffne POEditor","Open Translation Site":"Öffne die Übersetzungs-Website","Password to decrypt":"Entschlüsselungspasswort","Password to encrypt":"Verschlüsselungspasswort","Please enter a password to use for the wallet":"Wähle ein Passwort, um das Wallet zu verwenden","Repair":"Reparieren","Send BCB":"Sende Nanos","Start sending BCB":"Beginne damit, Nanos zu senden","To get started, you need BCB. Share your account to receive BCB.":"Um zu beginnen, benötigst du Nanos. Teile deine Adresse mit anderen, um Nanos zu erhalten.","To get started, you need an Account in your wallet to receive BCB.":"Um zu beginnen und Nanos zu erhalten, benötigst du ein Konto in deinem Wallet.","Type below to see if an alias is free to use.":"Prüfe, ob dein Wunsch-Alias verfügbar ist","Use Server Side PoW":"Serverseitiges PoW verwenden","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Wir sind immer auf der Suche nach Hilfe bei der Übersetzung der App! Wenn du uns helfen möchtest, tritt unserer Community auf POEditor bei.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Du kannst dieses Projekt unterstützen, indem du dich für unsere Community-Übersetzung auf POEditor registrierst. Wir freuen uns darauf, von dir zu hören!","You can scan BCB addresses, payment requests and more.":"Du kannst BCB-Adressen, Zahlungsanfragen und mehr scannen.","Your Bitcoin Black Betanet Wallet is ready!":"Dein BCB-Wallet ist bereit!","Your BCB wallet seed is backed up!":"Dein Wallet Seed ist gesichert!","Account":"Adresse","An account already exists with that name":"Es besteht bereits ein Konto mit diesem Namen","Confirm your PIN":"PIN bestätigen","Enter a descriptive name":"Gib einen aussagekräftigen Namen ein","Failed to generate seed QR code":"Erstellen des Seed QR Codes fehlgeschlagen","Incorrect PIN, try again.":"Falscher PIN, versuche es nochmal.","Incorrect code format for a seed:":"Falsches Format für eine Seed:","Information":"Information","Not a seed QR code:":"Kein Seed QR Code:","Please enter your PIN":"Bitte PIN eingeben","Scan this QR code to import seed into another application":"Scanne diesen QR Code um deine Seed in eine andere Anwendung zu importieren","Security Preferences":"Sicherheitseinstellungen","Your current password":"Dein aktuelles Passwort","Your password has been changed":"Dein Passwort wurde geändert","Canoe stores your BCB using cutting-edge security.":"Canoe speichert deine Nanos mit innovativen Sicherheitsmechanismen.","Caution":"Achtung","Decrypting wallet...":"Entschlüssele Wallet...","Error after loading wallet:":"Fehler nach dem Laden deines Wallets:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Ich verstehe, dass falls diese App gelöscht wird, mein Wallet nur mit dem Seed oder der Wallet-Wiederherstellungsdatei wiederhergestellt werden kann.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Das Importieren eines Wallets löscht das aktuelle Wallet samt aller verknüpfter Konten. Zur Sicherheit solltest du vorher den aktuellen Seed oder die Wiederherstellungsdatei sichern.","Incorrect code format for an account:":"Falsches Format für ein Konto:","Just scan and pay.":"Einfach scannen und bezahlen.","Manage":"Verwaltung","BCB is Feeless":"BCB ist gebührenfrei","BCB is Instant":"BCB ist blitzschnell","BCB is Secure":"BCB ist sicher","Never pay transfer fees again!":"Zahle nie wieder Transaktionsgebühren!","Support":"Support","Trade BCB for other currencies like USD or Euros.":"Tausche BCB gegen andere Währungen, wie zum Beispiel<br>US-Dollar oder Euro.","Transfer BCB instantly to anyone, anywhere.":"Schicke BCB sofort zu jedem, überall.","Account Representative":"Account-Representative","Add to address book?":"Zum Adressbuch hinzufügen?","Alias Found!":"Alias gefunden!","At least 3 Characters.":"Mindestens 3 Buchstaben.","Checking availablity":"Prüfe Verfügbarkeit","Create Alias":"Erstelle Alias","Creating Alias...":"Alias wird erstellt ...","Do you want to add this new address to your address book?":"Willst du diese neue Adresse zu deinem Adressbuch hinzufügen?","Edit your alias.":"Bearbeite deinen Alias","Editing Alias...":"Alias wird bearbeitet ...","Email for recovering your alias":"E-Mail, um Alias wiederherzustellen","Enter a representative account.":"Gib einen Representative an.","Error importing wallet:":"Fehler beim Importieren des Wallets:","How to buy BCB":"Nanos kaufen","How to buy and sell BCB is described at the website.":"Wie man Nanos kaufen und verkaufen kann, wird auf der Webseite erklärt.","Invalid Alias!":"Ungültiger Alias!","Invalid Email!":"Ungültige E-Mail!","Let People Easily Find you With Aliases":"Werde leicht gefunden mit deinem eigenen Alias","Link my wallet to my phone number.":"Verknüpfe mein Wallet mit meiner Telefonnummer","Looking up @{{addressbookEntry.alias}}":"Suche @{{addressbookEntry.alias}}","Make my alias private.":"Privater Alias","Refund":"Rückzahlung","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Die Reparatur deines Wallets kann einige Zeit dauern. Währenddessen werden sämtliche mit deinem Wallet verbundenen Blockchains neu geladen. Bist du sicher, dass du das willst?","Representative":"Representative","Representative changed":"Representative wurde geändert","That alias is taken!":"Dieser Alias ist bereits vergeben","The official English Terms of Service are available on the Canoe website.":"Die offiziellen englischen Nutzungsbedingungen sind auf der Canoe-Webseite verfügbar.","Valid Alias & Email":"Gültiger Alias & E-Mail-Adresse","View Block on BCB Block Explorer":"Betrachte diesen Block auf BCB Block Explorer","View on BCB Block Explorer":"Auf BCB Block Explorer betrachten","What alias would you like to reserve?":"Welchen Alias möchtest du reservieren?","You can change your alias, email, or privacy settings.":"Du kannst Alias, E-Mail und Privatsphäre-Einstellungen anpassen.","Your old password was not entered correctly":"Dein altes Passwort wurde falsch eingegeben","joe.doe@example.com":"max.mustermann@beispiel.de","joedoe":"maxmustermann","Wallet is Locked":"Canoe ist gesperrt","Forgot Password?":"Passwort vergessen?","4-digit PIN":"4-stellige PIN","Anyone with your seed can access or spend your BCB.":"Wer Zugang zu deinem Seed hat, kann auf dein Wallet zugreifen und deine Nanos ausgeben.","Background Behaviour":"Verhalten bei Inaktivität","Change 4-digit PIN":"4-stellige PIN ändern","Change Lock Settings":"Sicherheitseinstellungen ändern","Fingerprint":"Fingerabdruck","Go back to onboarding.":"Gehe zurück zum Onboarding.","Hard Lock":"Ruhezustand","Hard Timeout":"Timeout für Ruhezustand","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Delegiere das Proof of Work an den Canoe-Server. Auf mobilen Geräten ist diese Option immer deaktiviert.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Zeige eine Liste aller kürzlich getätigten Transaktionen auf der Startseite. Aktuell inkorrekt, wird noch implementiert.","Lock when going to background":"Sperren bei Inaktivität","None":"Keines","Password":"Passwort","Saved":"Gespeichert","Soft Lock":"Standby","Soft Lock Type":"Sperre für Standby","Soft Timeout":"Timeout für Standby","Timeout in seconds":"Timeout in Sekunden","Unrecognized data":"Nicht unterstützter Datentyp","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Ruhezustand</h5>\n    Im Ruhezustand wird dein Wallet verschlüsselt und komplett aus dem Speicher entfernt.","A new version of this app is available. Please update to the latest version.":"Eine neue Version der App ist verfügbar. Bitte aktualisiere auf die neueste Version.","Backend URL":"URL des Backends","Change Backend":"Backend ändern","Change Backend Server":"Backend-Server ändern","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Wenn du ein neues Wallet importierst, wird dein aktuelles Wallet samt aller Konten gelöscht! Stelle sicher, dass du ein Backup deines Seeds erstellt hast. Tippe dann \"delete\" ein, um dein aktuelles Wallet zu löschen.","Max":"Max.","delete":"löschen","bitcoin.black":"bitcoin.black","Confirm Password":"Passwort bestätigen","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Zurückgehen zum Onboarding wird all deine Wallets entfernen! Wenn du Gelder in deiner derzeitigen Wallet hast, stelle sicher, dass du ein Backup hast. Tippe \"delete\", um das Entfernen deiner derzeitigen Wallet zu bestätigen.","Please enter a password of at least 8 characters":"Gib bitte ein Passwort mit mindestens 8 Zeichen ein.","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"Hier siehst du alle deine Konten. Schau dir unsere<a ng-click=\"openExternalLinkHelp()\">FAQs</a> an bevor du beginnst!","Play Sounds":"Spiele Klänge","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"\n<h5 class=\"toggle-label\" translate=\"\">Hintergrundverhalten</h5>\n            <p translate=\"\">\nWähle den Sperrmodus, wenn Canoe in den Hintergrund geht. Wähle Keine, um Hintergrund-Sperrung zu deaktivieren. </p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":"\n<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">\nMit Soft Lock ist Canoe gesperrt, aber deine Wallet ist immer noch unverschlüsselt im Speicher. Das Aktivieren von Locks ermöglicht simplere Sicherungen wie PINs oder Fingerabdrücke. </p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Wähle den Sperrmodus, wenn Canoe in den Hintergrund geht. Wähle Keine, um Hintergrund-Sperrung zu deaktivieren.","Encryption Time!":"Zeit zum Verschlüsseln!","Enter at least 8 characters to encrypt your wallet.":"Gib mindestens 8 Zeichen ein, um deine Wallet zu verschlüsseln.","Password length ok":"Passwortlänge ok","Passwords do not match":"Passwörter sind nicht identisch","Unlock":"Entsperren","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Mit Soft Lock ist Canoe gesperrt, aber deine Wallet ist immer noch unverschlüsselt im Speicher. Das Aktivieren von Soft Locks ermöglicht simplere Sicherungen wie PINs oder Fingerabdrücke.","Attributions":"Danksagungen","Block was scanned and sent successfully":"Block wurde gescannt und erfolgreich versendet","Block was scanned but failed to process:":"Block wurde gescannt, konnte aber nicht verarbeitet werden","Failed connecting to backend":"Verbindung zum Server fehlgeschlagen","Failed connecting to backend, no network?":"Verbindung zum Server fehlgeschlagen, keine Netzwerkverbindung?","Successfully connected to backend":"Erfolgreich mit dem Server verbunden","BCB Account":"BCB Konto","Send BCB to this address":"Sende BCB zu dieser Addresse"});
    gettextCatalog.setStrings('es', {"A member of the team will review your feedback as soon as possible.":"Un miembro del equipo revisará tus comentarios tan pronto como sea posible.","About":"Acerca de","Account Information":"Información de la Cuenta","Account Name":"Nombre de la Cuenta","Account Settings":"Ajustes de la Cuenta","Account name":"Nombre de la Cuenta","Accounts":"Cuentas","Add Contact":"Agregar contacto","Add account":"Agregar cuenta","Add as a contact":"Agregar como Contacto","Add description":"Añadir descripción","Address Book":"Agenda de contactos","Advanced":"Avanzado","Advanced Settings":"Ajustes Avanzados","Allow Camera Access":"Permitir el acceso de la cámara","Allow notifications":"Permitir notificaciones","Almost done! Let's review.":"¡Casi listo! Vamos a revisar.","Alternative Currency":"Moneda Alternativa","Amount":"Importe","Are you being watched?":"¿Estás siendo observado?","Are you sure you want to delete this contact?":"¿Está seguro de que desea eliminar este contacto?","Are you sure you want to delete this wallet?":"¿Estás seguro de borrar esta billetera?","Are you sure you want to skip it?":"¿Estás seguro de omitirla?","Backup Needed":"Se necesita copia de seguridad","Backup now":"Realizar copia de seguridad","Backup wallet":"Respaldar billetera","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Ten presente guardar tu semilla en un lugar seguro. Si la app de tu billetera es eliminada, o tu dispositivo es robado, la semilla será la única manera de recuperar tu billetera.","Browser unsupported":"Navegador no soportado","But do not lose your seed!":"¡Nunca pierdas la semilla!","Buy &amp; Sell Bitcoin":"Compra, amplía tu inversión, vende Bitcoins","Cancel":"Cancelar","Cannot Create Wallet":"No se pudo crear la billetera","Choose a backup file from your computer":"Selecciona el archivo de copia de seguridad de tu computadora","Click to send":"Click para enviar","Close":"Cerrar","Coin":"Moneda","Color":"Color","Commit hash":"Generar funciones hash","Confirm":"Confirmar","Confirm &amp; Finish":"Confirmar y finalizar","Contacts":"Contactos","Continue":"Continuar","Contribute Translations":"Contribuye con las traducciones","Copied to clipboard":"Copiado al portapapeles","Copy this text as it is to a safe place (notepad or email)":"Copiar el texto como está en un lugar seguro (bloc de notas o correo electrónico)","Copy to clipboard":"Copiar al portapapeles","Could not access the wallet at the server. Please check:":"No se pudo acceder a la billetera desde el servidor. Por favor verificar:","Create Account":"Crear una cuenta","Create new account":"Crear una nueva cuenta","Creating Wallet...":"Creando billetera...","Creating account...":"Creando cuenta....","Creating transaction":"Creando transacción","Date":"Fecha","Default Account":"Cuenta por defecto","Delete":"Eliminar","Delete Account":"Eliminar cuenta","Delete Wallet":"Eliminar billetera","Deleting Wallet...":"Eliminando billetera...","Do it later":"Hazlo luego","Donate to Bitcoin Black":"Donar a Canoe","Download":"Descargar","Edit":"Editar","Email":"Correo electrónico","Email Address":"Dirección de correo electrónico","Enable camera access in your device settings to get started.":"Habilitar el acceso de la cámara en su configuración de dispositivo para empezar.","Enable email notifications":"Activar notificaciones de correo electrónico","Enable push notifications":"Activar notificaciones push","Enable the camera to get started.":"Activar la cámara empezar.","Enter amount":"Ingrese el monto","Enter wallet seed":"Ingrese la semilla de la billetera","Enter your password":"Ingrese su contraseña","Error":"Error","Error at confirm":"Error al confirmar","Error scanning funds:":"Error al escanear fondos:","Error sweeping wallet:":"Error al buscar fondos:","Export wallet":"Exportar billetera","Extracting Wallet information...":"Obteniendo Información de la billetera...","Failed to export":"Error al exportar","Family vacation funds":"Fondos para vacaciones en familia","Feedback could not be submitted. Please try again later.":"No se pudo enviar el comentario. Por favor intente nuevamente.","File/Text":"Archivo/Texto","Filter setting":"Ajuste de filtro","Finger Scan Failed":"Fallo en la verificación de la huella","Finish":"Finalizar","From":"Desde","Funds found:":"Fondos encontrados:","Funds transferred":"Fondos transferidos","Funds will be transferred to":"Los fondos serán transferidos a","Get started":{"button":"Comenzar"},"Get started by adding your first one.":"Comienza agregando el primero.","Go Back":"Volver","Go back":"Volver","Got it":"Entiendo","Help & Support":"Ayuda y Soporte","Help and support information is available at the website.":"La ayuda está disponible en el sitio web.","Hide Balance":"Balance Oculto","Home":"Inicio","How could we improve your experience?":"¿Cómo podríamos mejorar tu experiencia?","I don't like it":"No me gusta","I have read, understood, and agree with the Terms of use.":"He leído, entendido y acepto los Términos de uso.","I like the app":"Me gusta la aplicación","I think this app is terrible.":"Creo que esta aplicación es terrible.","I understand":"Entiendo","I understand that my funds are held securely on this device, not by a company.":"Entiendo que mis fondos están protegidos por el dispositivo y no por una empresa.","I've written it down":"Ya lo he anotado","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Si este dispositivo es reemplazado o la app eliminada, sus fondos no podrán recuperarse sin una copia de seguridad.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Si tienes comentarios adicionales, por favor envíalos pulsando la opción \"Enviar comentarios\" en la pestaña de preferencias.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Si tomas una captura de pantalla, otras aplicaciones podrían ver tu copia de seguridad. La forma más acertada es resguardarla con tinta y papel.","Import Wallet":"Importar billetera","Import seed":"Importar la semilla","Import wallet":"Importar billetera","Importing Wallet...":"Importando billetera...","In order to verify your wallet backup, please type your password.":"Para verificar la copia de seguridad de la billetera, por favor escriba la contraseña.","Incomplete":"Incompleta","Insufficient funds":"Fondos insuficientes","Invalid":"Inválido","Is there anything we could do better?":"¿Hay algo que podríamos mejorar?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Es muy importante anotar la semilla de tu billetera correctamente. Si algo sucediese con tu billetera, necesitarás la semilla para reconstruirla. Por favor, revisa tu semilla e intenta de nuevo.","Language":"Idioma","Learn more":"Más información","Loading transaction info...":"Cargando información de transacción...","Log options":"Opciones de registro","Makes sense":"Entiendo","Matches:":"Coincidencias:","Meh - it's alright":"Buu - está bien","Memo":"Nota","More Options":"Más opciones","Name":"Nombre","New account":"Nueva cuenta","No Account available":"Cuenta no disponible","No contacts yet":"Aún no hay contactos","No entries for this log level":"No hay entradas para este nivel de registro","No recent transactions":"No hay transacciones recientes","No transactions yet":"Aún no hay transacciones","No wallet found":"No se encontró la billetera","No wallet selected":"No se seleccionó una billetera","No wallets available to receive funds":"No hay billeteras disponibles para recibir fondos","Not funds found":"No se encontraron fondos","Not now":"Ahora no","Note":"Nota","Notifications":"Notificaciones","Notify me when transactions are confirmed":"Notificarme cuando se confirmen las transacciones","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Es un buen momento para realizar una copia de seguridad de la billetera. Si este dispositivo se pierde, será imposible acceder a los fondos.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Es el momento perfecto para mirar a tu alrededor. ¿ventanas? ¿cámaras? ¿gente curiosa?","Numbers and letters like 904A2CE76...":"Números y letras como 904A2CE76...","OK":"OK","OKAY":"LISTO","Official English Disclaimer":"Declaración de responsabilidad oficial en inglés","Oh no!":"¡Oh no!","Open":"Abrir","Open GitHub":"Abrir GitHub","Open GitHub Project":"Abrir Proyecto en GitHub","Open Settings":"Abrir Opciones","Open Website":"Abrir Sitio Web","Open website":"Abrir página web","Paste the backup plain text":"Pegar la copia de seguridad en texto plano","Payment Accepted":"Pago Aceptado","Payment Proposal Created":"Propuesta de Pago Creada","Payment Received":"Pago recibido","Payment Rejected":"Pago Rechazado","Payment Sent":"Pago Enviado","Permanently delete this wallet.":"Eliminar esta billetera de forma permanente.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Por favor, anote con cuidado esta semilla de 64 caracteres y copíela al portapapeles.","Please connect a camera to get started.":"Por favor, conecta una cámara para empezar.","Please enter the seed":"Por favor, ingrese la semilla","Please, select your backup file":"Por favor, selecciona el archivo de copia de seguridad","Preferences":"Preferencias","Preparing addresses...":"Preparando direcciones...","Preparing backup...":"Preparando copia de seguridad...","Press again to exit":"Presione nuevamente para salir","Private Key":"Clave privada","Private key encrypted. Enter password":"La clave privada está cifrada. Escriba la contraseña","Push Notifications":"Notificaciones Push","QR Code":"Código QR","Quick review!":"¡Revisión rápida!","Rate on the app store":"Califica la app en la Play Store","Receive":"Recibir","Received":"Recibido","Recent":"Recientes","Recent Transaction Card":"Tarjeta con transacciones recientes","Recent Transactions":"Transacciones Recientes","Recipient":"Destinatario","Release information":"Información de la versión","Remove":"Remover","Restore from backup":"Restaurar desde copia de seguridad","Retry":"Vuelva a intentarlo","Retry Camera":"Reintentar acceder a la cámara","Save":"Guardar","Scan":"Escanear","Scan QR Codes":"Escanear Código QR","Scan again":"Escanear de nuevo","Scan your fingerprint please":"Por favor ingrese su huella digital","Scanning Wallet funds...":"Buscando fondos en la billetera...","Screenshots are not secure":"Las capturas de pantallas no son seguras","Search Transactions":"Buscar transacciones","Search or enter account number":"Buscar e ingrese el número de cuenta","Search transactions":"Buscar transacciones","Search your currency":"Busca tu moneda","Select a backup file":"Seleccionar el archivo de copia de seguridad","Select an account":"Selecciona una cuenta","Send":"Enviar","Send Feedback":"Enviar Sugerencia","Send by email":"Enviar por correo electrónico","Send from":"Enviar desde","Send max amount":"Enviar la máxima cantidad","Send us feedback instead":"En su lugar, enviar comentario","Sending":"Enviando","Sending feedback...":"Enviando comentario...","Sending maximum amount":"Enviando cantidad máxima","Sending transaction":"Enviando transacción","Sending {{amountStr}} from your {{name}} account":"Enviando {{amountStr}} desde su cuenta {{name}}","Sent":"Enviado","Services":"Servicios","Session Log":"Registro de sesión","Session log":"Registro de sesión","Settings":"Configuración","Share the love by inviting your friends.":"Comparte la pasión invitando a tus amigos.","Show Account":"Mostrar Cuenta","Show more":"Ver más","Signing transaction":"Firmando transacción","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Ya que solo usted controla su dinero, necesitará guardar la semilla de su billetera en caso de eliminar esta app.","Skip":"Omitir","Slide to send":"Deslizar para enviar","Sweep":"Importar","Sweep paper wallet":"Importar billetera en papel","Sweeping Wallet...":"Leyendo la Billetera...","THIS ACTION CANNOT BE REVERSED":"ESTA ACCIÓN NO SE PUEDE REVERTIR","Tap and hold to show":"Tocar y mantener para mostrar","Terms Of Use":"Términos de uso","Terms of Use":"Términos de Uso","Text":"Texto","Thank you!":"¡Gracias!","Thanks!":"¡Gracias!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Es emocionante escucharlo. Nos encantaría ganar esa quinta estrella – ¿cómo podemos mejorar tu experiencia?","The seed":"La semilla","The seed is invalid, it should be 64 characters of: 0-9, A-F":"La semilla es inválida, debe usar 64 caracteres entre 0-9 y A-F","The wallet server URL":"URL del servidor de la billetera","There is an error in the form":"Hay un error en el formulario","There's obviously something we're doing wrong.":"Obviamente hay algo que estamos haciendo mal.","This app is fantastic!":"¡Esta aplicación es fantástica!","Timeline":"Línea de tiempo","To":"Para","Touch ID Failed":"Falló Touch ID","Transaction":"Transacción","Transfer to":"Transferir a","Transfer to Account":"Transferir a la cuenta","Try again in {{expires}}":"Intenta de nuevo en {{expires}}","Uh oh...":"Oh, oh...","Update Available":"Actualización Disponible","Updating... Please stand by":"Actualizando... Por favor, espera","Verify your identity":"Verificar tu identidad","Version":"Versión","View":"Ver","View Terms of Service":"Ver Términos de Uso","View Update":"Ver Actualización","Wallet Accounts":"Cuentas de la billetera","Wallet File":"Archivo de la billetera","Wallet Seed":"Semilla de la billetera","Wallet seed not available":"Semilla de la billetera no está disponible","Warning!":"¡Advertencia!","Watch out!":"¡Cuidado!","We'd love to do better.":"Nos encantaría hacerlo mejor.","Website":"Página web","What do you call this account?":"¿Cuál es el nombre de esta cuenta?","Would you like to receive push notifications about payments?":"¿Quieres recibir notificaciones push sobre sus transacciones?","Yes":"Si","Yes, skip":"Si, omitir","You can change the name displayed on this device below.":"Puedes cambiar abajo el nombre mostrado en este dispositivo.","You can create a backup later from your wallet settings.":"Puedes hacerlo después desde las preferencias de la billetera.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Puede ver las últimas novedades y contribuir a nuestra aplicación de código abierto visitando nuestro proyecto en GitHub.","You can still export it from Advanced &gt; Export.":"Todavía puede exportar en Avanzados, Exportar.","You'll receive email notifications about payments sent and received from your wallets.":"Recibirás notificaciones por correo electrónico acerca de pagos enviados y recibidos de tus billeteras.","Your ideas, feedback, or comments":"Ideas, sugerencias o comentarios","Your password":"Contraseña","Your wallet is never saved to cloud storage or standard device backups.":"Tu billetera nunca se sube a la nube ni se resguarda automáticamente en el dispositivo.","[Balance Hidden]":"[Balance Oculto]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"He leído, entendido y estoy de acuerdo con la  <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Las calificaciones de 5 estrellas nos ayudan a conseguir que Canoe llegue a manos de más usuarios, esto significa más recursos para la aplicación!","At least 8 Characters. Make it good!":"Usa al menos 8 caracteres ¡hazlo bien!","Change Password":"Cambiar la contraseña","Confirm New Password":"Confirma la nueva contraseña","How do you like Canoe?":"¿Qué te parece Canoe?","Let's Start":"¡Empecemos!","New Password":"Nueva contraseña","Old Password":"Contraseña anterior","One more time.":"Una vez más.","Password too short":"Contraseña muy corta","Passwords don't match":"Las contraseñas no coinciden","Passwords match":"Las contraseñas coinciden","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Las notificaciones para Canoe ahora están desactivadas, habilítalas en Ajustes.","Share Canoe":"Comparte Canoe","There is a new version of Canoe available":"Hay disponible una nueva versión de Canoe","We're always looking for ways to improve Canoe.":"Siempre estamos buscando la manera de mejorar Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Siempre estamos buscando la manera de mejorar Canoe. ¿Cómo podríamos mejorar tu experiencia?","Would you be willing to rate Canoe in the app store?":"¿Estarías dispuesto a calificar a Canoe en la tienda de aplicaciones?","Account Alias":"Alias de la Cuenta","Account Color":"Color de la Cuenta","Alias":"Alias","Backup seed":"Respaldar semilla","Create Wallet":"Crear billetera","Don't see your language? Sign up on POEditor! We'd love to support your language.":"¿No ves tu idioma? ¡Registrate en POEditor! Nos gustaría agregar soporte para tu idioma.","Edit Contact":"Editar Contacto","Enter password":"Ingresar contraseña","Incorrect password, try again.":"Contraseña incorrecta, intenta nuevamente.","Joe Doe":"Juan Pérez","Join the future of money,<br>get started with BCB.":"Unete al dinero del futuro,<br>comienza a usar BCB.","Lock wallet":"Bloquear Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB es diferente &ndash; no puede almacenarse de forma segura en un banco o servicio web.","No accounts available":"No hay cuentas disponibles","No backup, no BCB.":"Sin copia de seguridad, no hay BCB.","Open POEditor":"Abrir POEditor","Open Translation Site":"Abrir sitio de traducción","Password to decrypt":"Contraseña para descifrar","Password to encrypt":"Contraseña para cifrar","Please enter a password to use for the wallet":"Por favor ingresa una contraseña para usar en tu billetera","Repair":"Reparar","Send BCB":"Enviar BCB","Start sending BCB":"Comenzar a enviar BCB","To get started, you need BCB. Share your account to receive BCB.":"Para comenzar, necesitas BCB. Comparte tu cuenta para recibir BCB.","To get started, you need an Account in your wallet to receive BCB.":"Para comenzar, necesitas una cuenta en tu billetera para recibir BCB.","Type below to see if an alias is free to use.":"Escribe para ver si un alias esta disponible.","Use Server Side PoW":"Usar PoW por medio del servidor","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"¡Siempre estamos buscando contribuciones para traducción! Puedes hacer correcciones o ayudar para que esta aplicación este disponible en tu idioma nativo uniéndote a nuestra comunidad en POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Puedes hacer contribuciones uniéndote al proyecto de traducción de nuestra comunidad en POEditor. ¡Esperamos escuchar pronto sobre ti!","You can scan BCB addresses, payment requests and more.":"Puedes capturar direcciones BCB, solicitudes de pago, y mucho más.","Your Bitcoin Black Betanet Wallet is ready!":"¡Tu billetera BCB esta lista!","Your BCB wallet seed is backed up!":"¡La semilla de tu billetara BCB ha sido respaldada!","Account":"Cuenta","An account already exists with that name":"Una cuenta ya existe con ese nombre","Confirm your PIN":"Confirma tu PIN","Enter a descriptive name":"Ingresa un nombre descriptivo","Failed to generate seed QR code":"No fue posible generar el código QR de la semilla","Incorrect PIN, try again.":"PIN incorrecto, intenta nuevamente.","Incorrect code format for a seed:":"El formato de la semilla es incorrecto:","Information":"Información","Not a seed QR code:":"No es un código QR de una semilla:","Please enter your PIN":"Por favor ingresa tu PIN","Scan this QR code to import seed into another application":"Captura este código QR para importar la semilla en otra aplicación","Security Preferences":"Preferencias de seguridad","Your current password":"Tu contraseña actual","Your password has been changed":"Tu contraseña ha sido cambiada","Canoe stores your BCB using cutting-edge security.":"Canoe guarda tus BCB usando seguridad de ultima generación.","Caution":"Precaución","Decrypting wallet...":"Descifrando billetera...","Error after loading wallet:":"Error luego de cargar la billetera:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Entiendo que si esta aplicación es borrada, mi billetera solo puede ser recuperada con la semilla o con un archivo de respaldo de la billetera.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Importar una billetera eliminará tu billetera actual y todas sus cuentas. Probablemente quieras primero guardar tu semilla actual o crear un archivo de respaldo de tu billetera.","Incorrect code format for an account:":"Formato incorrecto para una cuenta:","Just scan and pay.":"Solo captura para pagar.","Manage":"Manejo","BCB is Feeless":"BCB es libre de comisiones","BCB is Instant":"BCB es instantaneo","BCB is Secure":"BCB es seguro","Never pay transfer fees again!":"¡Nunca más pagues de nuevo comisiones de transferencia!","Support":"Soporte","Trade BCB for other currencies like USD or Euros.":"Intercambia BCB por divisas como Dolares o Euros.","Transfer BCB instantly to anyone, anywhere.":"Transfiere BCB instantáneamente a cualquiera, en cualquier lugar.","Account Representative":"Representante de cuenta","Add to address book?":"Agregar a directorio?","Alias Found!":"Alias encontrado!","At least 3 Characters.":"Mínimo 3 caracteres.","Checking availablity":"Chequeando disponibilidad.","Create Alias":"Crear Alias","Creating Alias...":"Creando Alias...","Do you want to add this new address to your address book?":"Deseas agregar esta dirección a tu directorio?","Edit your alias.":"Edita tu alias.","Editing Alias...":"Editando alias...","Email for recovering your alias":"Email para recuperar tu alias","Enter a representative account.":"Ingresa una cuenta como representante.","Error importing wallet:":"Error importando la billetera:","How to buy BCB":"Como comprar","How to buy and sell BCB is described at the website.":"Como comprar y vender BCB está explicado en el sitio.","Invalid Alias!":"¡Alias inválido!","Invalid Email!":"¡Email inválido!","Let People Easily Find you With Aliases":"Permite a la gente encontrarte fácilmente usando un alias","Link my wallet to my phone number.":"Asociar mi billetera a mi número de teléfono.","Looking up @{{addressbookEntry.alias}}":"Buscando @{{addressbookEntry.alias}}","Make my alias private.":"Hacer que mi alias sea privado.","Refund":"Reembolso","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Reparar tu billetera puede tomar algo de tiempo. Esto recargará toda la cadena de bloques asociada a tu billetera. ¿Estás seguro de que quieres repararla?","Representative":"Representante","Representative changed":"El representando a sido cambiado","That alias is taken!":"¡Ese alias ya está utilizado!","The official English Terms of Service are available on the Canoe website.":"Los términos de servicio oficiales están disponibles en el sitio web de Canoe.","Valid Alias & Email":"Alias e Email válidos","View Block on BCB Block Explorer":"Ver Bloque en BCB Block Explorer","View on BCB Block Explorer":"Ver en BCB Block Explorer","What alias would you like to reserve?":"¿Que alias te gustaría reservar?","You can change your alias, email, or privacy settings.":"Puedes cambiar tu alias, email, o ajustes de privacidad.","Your old password was not entered correctly":"Tu contraseña anterior no ha sido ingresada correctamente","joe.doe@example.com":"juan.perez@ejemplo.com","joedoe":"juanperez","Wallet is Locked":"Canoe esta bloqueado","Forgot Password?":"¿Olvidaste tu contraseña?","4-digit PIN":"PIN de 4 dígitos","Anyone with your seed can access or spend your BCB.":"Cualquiera con tu semilla puede acceder o gastar tus BCB.","Background Behaviour":"Comportamiento en segundo plano","Change 4-digit PIN":"Cambiar PIN de 4 dígitos","Change Lock Settings":"Cambiar ajustes de Bloqueo","Fingerprint":"Huella digital","Go back to onboarding.":"Volver a comenzar","Hard Lock":"Bloqueo Profundo","Hard Timeout":"Tiempo de espera para Bloqueo Profundo","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Si está habilitada, la Prueba de Trabajo se delega al servidor de Canoe. Esta opción está deshabilitada y por ahora siempre es verdadera en los dispositivos móviles de Canoe.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Si está habilitada, una lista de las transacciones recientes va a aparecer en la pantalla de inicio. Actualmente falso, no está implementado.","Lock when going to background":"Bloquear al pasar a segundo plano","None":"Ninguno","Password":"Contraseña","Saved":"Guardado","Soft Lock":"Bloqueo Rápido","Soft Lock Type":"Tipo de Bloqueo Rápido","Soft Timeout":"Tiempo de espera para Bloqueo Rápido","Timeout in seconds":"Tiempo de espera (en segundos)","Unrecognized data":"Datos no reconocidos","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Bloqueo Profundo</h5>\n          Al usar Bloqueo Profundo, Canoe cifra tu billetera y la borra sus rastros de la memoria. No puedes deshabilitar el Bloqueo Profundo, pero puedes configurar un tiempo de espera muy alto.","A new version of this app is available. Please update to the latest version.":"Una nueva versión de esta app está disponible. Por favor, actualiza a la ultima versión.","Backend URL":"URL del Backend","Change Backend":"Cambiar Backend","Change Backend Server":"Cambiar servidor del Backend","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"¡Importar una billetera va a borrar tu billetera existente y sus cuentas! Si tienes fondos en tu billetera actual, asegurate de tener una copia de seguridad para restaurarla. Ingresa \"eliminar\" para confirmar que quieres borrar tu billetera actual.","Max":"Máximo","delete":"eliminar","bitcoin.black":"bitcoin.black"});
    gettextCatalog.setStrings('et', {"A member of the team will review your feedback as soon as possible.":"Meeskonnaliige vaatab üle Sinu ettepaneku kohe kui võimalik.","About":"Info","Account Information":"Konto informatsioon","Account Name":"Konto nimi","Account Settings":"Konto seaded","Account name":"Konto nimi","Accounts":"Kontod","Add Contact":"Lisa kontakt","Add account":"Lisa konto","Add as a contact":"Lisa kontaktina","Add description":"Lisa kirjeldus","Address Book":"Aadressiraamat","Advanced":"Edasijõudnutele","Advanced Settings":"Seadistused edasijõudnutele","Allow Camera Access":"Luba kaamera ligipääs","Allow notifications":"Luba teated","Almost done! Let's review.":"Peaaegu valmis! Vaatame üle.","Alternative Currency":"Alternatiivne Valuuta","Amount":"Kogus","Are you being watched?":"Kas sind vaadatakse?","Are you sure you want to delete this contact?":"Kas sa oled kindel, et tahad selle kontakti kustutada?","Are you sure you want to delete this wallet?":"Kas sa oled kindel, et tahad selle rahakoti kustutada?","Are you sure you want to skip it?":"Kas sa oled kindel, et soovid selle vahele jätta?","Backup Needed":"Varukoopia tegemine on vajalik","Backup now":"Tee varukoopia kohe","Backup wallet":"Tee varukoopia rahakotist","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Ole kindel, et hoiad oma seeme õiges kohas. Kui selle applikatsiooni kustutad või sinu nutiseade varastatakse, on seeme ainuke võimalus, kuidas taastada oma rahakott.","Browser unsupported":"Brauserit ei toetata","But do not lose your seed!":"Aga ära kaota oma seemet!","Buy &amp; Sell Bitcoin":"Buy Bitcoin, Sell Bitcoin","Cancel":"Tühista","Cannot Create Wallet":"Ei saa rahakotti luua","Choose a backup file from your computer":"Vali varukoopia fail oma arvutist","Click to send":"Vajuta, et saata","Close":"Sulge","Coin":"Münt","Color":"Värv","Confirm":"Nõustu","Confirm &amp; Finish":"Nõustu %amp; Lõpeta","Contacts":"Kontaktid","Continue":"Jätka","Contribute Translations":"Abista tõlgete lisamisega","Copied to clipboard":"Kopeeri","Copy this text as it is to a safe place (notepad or email)":"Kopeeri see tekst, nagu see on hetkel, turvalisse kohta (märkmikusse või emaili)","Copy to clipboard":"Kopeeri","Could not access the wallet at the server. Please check:":"Ei saa ligipääsu rahakotile serverilt. Palun kontrolli kas:"});
    gettextCatalog.setStrings('fr', {"A member of the team will review your feedback as soon as possible.":"Un membre de l’équipe passera en revue votre avis dès que possible.","About":"À propos de","Account Information":"Informations sur le compte","Account Name":"Nom du compte","Account Settings":"Paramètres du compte","Account name":"Nom du compte","Accounts":"Comptes","Add Contact":"Ajouter un contact","Add account":"Ajouter un compte","Add as a contact":"Ajouter comme contact","Add description":"Ajouter une description","Address Book":"Répertoire","Advanced":"Paramètres avancés","Advanced Settings":"Paramètres avancés","Allow Camera Access":"Autoriser l'accès à la caméra","Allow notifications":"Autoriser les notifications","Almost done! Let's review.":"C'est presque terminé ! Vérifions.","Alternative Currency":"Devise alternative","Amount":"Montant","Are you being watched?":"Êtes-vous surveillé(e) ?","Are you sure you want to delete this contact?":"Souhaitez-vous réellement supprimer ce contact ?","Are you sure you want to delete this wallet?":"Êtes-vous certain(e) de vouloir supprimer ce portefeuille ?","Are you sure you want to skip it?":"Êtes-vous sûr(e) de vouloir ignorer la sauvegarde ?","Backup Needed":"Sauvegarde requise","Backup now":"Sauvegarder maintenant","Backup wallet":"Sauvegarder le portefeuille","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Sauvegardez bien votre seed dans un endroit sûr. Si cette app est supprimée ou si votre terminal est volé, le seul moyen de recréer le portefeuille est d'utiliser le seed.","Browser unsupported":"Navigateur non supporté","But do not lose your seed!":"Mais ne perdez pas votre seed !","Buy &amp; Sell Bitcoin":"Acheter &amp; vendre des bitcoins","Cancel":"Annuler","Cannot Create Wallet":"Impossible de créer le portefeuille","Choose a backup file from your computer":"Choisissez un fichier de sauvegarde depuis votre ordinateur","Click to send":"Cliquez pour envoyer","Close":"Fermer","Coin":"Crypto-monnaie","Color":"Couleur","Commit hash":"Commit hash","Confirm":"Confirmer","Confirm &amp; Finish":"Confirmer &amp; Terminer","Contacts":"Contacts","Continue":"Continuer","Contribute Translations":"Contribuer aux traductions","Copied to clipboard":"Copié(e) dans le presse-papier","Copy this text as it is to a safe place (notepad or email)":"Copiez ce texte présenté tel quel vers un endroit sûr (bloc-notes ou e-mail)","Copy to clipboard":"Copier dans le presse-papier","Could not access the wallet at the server. Please check:":"Impossible d'accéder au portefeuille via le serveur. Veuillez vérifier :","Create Account":"Créer un compte","Create new account":"Créer un nouveau compte","Creating Wallet...":"Création du portefeuille...","Creating account...":"Création du compte...","Creating transaction":"Création de la transaction","Date":"Date","Default Account":"Nouveau compte","Delete":"Supprimer","Delete Account":"Supprimer compte","Delete Wallet":"Supprimer le portefeuille","Deleting Wallet...":"Suppression du portefeuille...","Do it later":"La faire plus tard","Donate to Bitcoin Black":"Don à Canoe","Download":"Télécharger","Edit":"Modifier","Email":"E-mail","Email Address":"Adresse e-mail","Enable camera access in your device settings to get started.":"Autorisez l’accès à la caméra dans les réglages de votre appareil pour commencer.","Enable email notifications":"Activer les notifications e-mail","Enable push notifications":"Autoriser les notifications","Enable the camera to get started.":"Autorisez la caméra pour commencer.","Enter amount":"Saisissez un montant","Enter wallet seed":"Entrer le seed du portefeuille","Enter your password":"Écrivez votre mot de passe","Error":"Erreur","Error at confirm":"Erreur à la confirmation","Error scanning funds:":"Erreur de numérisation des fonds :","Error sweeping wallet:":"Erreur de balayage de portefeuille :","Export wallet":"Exporter le portefeuille","Extracting Wallet information...":"Extraction des informations du portefeuille...","Failed to export":"Impossible d'exporter","Family vacation funds":"Fonds pour les vacances familiales","Feedback could not be submitted. Please try again later.":"Vos commentaires n'ont pas pu être envoyés. Veuillez réessayer plus tard.","File/Text":"Fichier / Texte","Filter setting":"Paramètres de filtre","Finger Scan Failed":"La numérisation digitale a échoué","Finish":"Terminer","From":"De","Funds found:":"Fonds trouvés :","Funds transferred":"Fonds transférés","Funds will be transferred to":"Les fonds seront transférés à ","Get started":{"button":"Commencer"},"Get started by adding your first one.":"Commencez par ajouter votre premier contact.","Go Back":"Retour","Go back":"Retour","Got it":"J'ai compris","Help & Support":"Aide & Support","Help and support information is available at the website.":"De l'aide peut être trouvée sur le site internet (en anglais pour le moment).","Hide Balance":"Masquer le solde","Home":"Accueil","How could we improve your experience?":"Comment pourrions-nous améliorer votre expérience ?","I don't like it":"Je ne l'aime pas","I have read, understood, and agree with the Terms of use.":"J'ai lu, compris et suis d'accord avec les conditions d'utilisation.","I like the app":"J'aime l'appli","I think this app is terrible.":"Je déteste cette appli","I understand":"Je comprends","I understand that my funds are held securely on this device, not by a company.":"Je comprends que mes fonds sont en toute sécurité sur cet appareil et non détenus par une entreprise.","I've written it down":"Je l'ai bien écrite","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Si ce terminal est remplacé, ou cette app supprimée, vos fonds ne peuvent être récupérés sans une sauvegarde","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Si vous avez d'autres commentaires, veuillez nous en informer en appuyant sur l'option « Envoyer un avis » dans l'onglet Paramètres.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Si vous prenez une capture d’écran, votre sauvegarde peut être vue par d’autres applications. Vous pouvez faire une sauvegarde physique sécurisée avec du papier et un stylo.","Import Wallet":"Importer un portefeuille","Import seed":"Importer une graine (seed)","Import wallet":"Importer un portefeuille","Importing Wallet...":"Importation du portefeuille...","In order to verify your wallet backup, please type your password.":"Afin de vérifier la sauvegarde de votre portefeuille, veuillez saisir votre mot de passe.","Incomplete":"Non terminé","Insufficient funds":"Fonds insuffisants","Invalid":"Invalide","Is there anything we could do better?":"Y a-t-il quelque chose que nous pourrions améliorer ?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Il est important que vous notiez la graine (seed) de votre portefeuille correctement. S'il arrive quelque chose à votre portefeuille, vous aurrez besoin de cette graine pour le reconstruire. Relisez, s'il vous plait, votre graine et ré-essayez.","Language":"Langue","Learn more":"En savoir plus","Loading transaction info...":"Chargement des infos de transaction...","Log options":"Options de log","Makes sense":"C'est logique","Matches:":"Correspondances :","Meh - it's alright":"Ça peut aller","Memo":"Note","More Options":"Plus d'options","Name":"Nom","New account":"Nouveau compte","No Account available":"Aucun compte disponible","No contacts yet":"Aucun contact","No entries for this log level":"Aucune entrée pour ce niveau de log","No recent transactions":"Aucune transaction récente","No transactions yet":"Aucune transaction","No wallet found":"Aucun portefeuille trouvé","No wallet selected":"Aucun portefeuille sélectionné","No wallets available to receive funds":"Aucun portefeuille disponible pour recevoir des fonds","Not funds found":"Aucun fonds trouvé","Not now":"Pas maintenant","Note":"Note","Notifications":"Notifications","Notify me when transactions are confirmed":"Me notifier quand les transactions se confirment","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"C'est un bon moment pour sauvegarder votre portefeuille. Si cet appareil est perdu, vos fonds seront irrécupérables sans une sauvegarde.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"C'est le moment d'observer autour de vous ! Personne aux fenêtres ? Derrière vous ? Aucune caméra cachée ?","Numbers and letters like 904A2CE76...":"Des chiffres et des lettres comme 904A2CE76...","OK":"Ok","OKAY":"OK","Official English Disclaimer":"Clause de non-responsabilité anglaise officielle","Oh no!":"Oh non !","Open":"Ouvrir","Open GitHub":"Ouvrir GitHub","Open GitHub Project":"Ouvrir le projet GitHub","Open Settings":"Ouvrir les paramètres","Open Website":"Ouvrir le site internet","Open website":"Ouvrir le site internet","Paste the backup plain text":"Coller la sauvegarde en toutes lettres","Payment Accepted":"Paiement accepté","Payment Proposal Created":"Proposition de paiement créée","Payment Received":"Paiement reçu","Payment Rejected":"Paiement rejeté","Payment Sent":"Paiement envoyé","Permanently delete this wallet.":"Supprimer définitivement ce portefeuille.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Veuillez noter consciencieusement les 64 caractères de cette graine (seed). Cliquez pour copier dans le presse-papier.","Please connect a camera to get started.":"Veuillez connecter une caméra pour commencer.","Please enter the seed":"Veuillez entrer le seed","Please, select your backup file":"Veuillez sélectionner votre fichier de sauvegarde","Preferences":"Préférences","Preparing addresses...":"Préparation des adresses...","Preparing backup...":"Préparation de la sauvegarde...","Press again to exit":"Appuyez de nouveau pour quitter","Private Key":"Clé privée","Private key encrypted. Enter password":"Clé privée chiffrée. Saisissez le mot de passe","Push Notifications":"Notifications","QR Code":"Code QR","Quick review!":"Récapitulatif !","Rate on the app store":"Évaluer dans la boutique","Receive":"Recevoir","Received":"Reçus","Recent":"Transactions récentes","Recent Transaction Card":"Carte des transactions récentes","Recent Transactions":"Transactions récentes","Recipient":"Destinataire","Release information":"Informations de version","Remove":"Supprimer","Restore from backup":"Restaurer à partir d'une sauvegarde","Retry":"Rééssayer","Retry Camera":"Réessayer la caméra","Save":"Valider","Scan":"Numériser","Scan QR Codes":"Numérisez des codes QR","Scan again":"Réanalyser","Scan your fingerprint please":"Veuillez scanner votre empreinte digitale","Scanning Wallet funds...":"Analyse des fonds du portefeuille...","Screenshots are not secure":"Les captures d’écran ne sont pas sécurisées","Search Transactions":"Rechercher des transactions","Search or enter account number":"Chercher ou entrer un numéro de compte","Search transactions":"Rechercher des transactions","Search your currency":"Recherchez votre monnaie","Select a backup file":"Sélectionner un fichier de sauvegarde","Select an account":"Sélectionner un compte","Send":"Envoyer","Send Feedback":"Envoyer un avis","Send by email":"Envoyer par e-mail","Send from":"Envoyer à partir de","Send max amount":"Envoyer le montant maximal","Send us feedback instead":"Nous envoyer un avis à la place","Sending":"Envoi","Sending feedback...":"Envoi de votre avis...","Sending maximum amount":"Envoi du montant maximal","Sending transaction":"Envoi de la transaction","Sending {{amountStr}} from your {{name}} account":"{{amountStr}} prêts à l'envoi depuis votre compte {{name}}","Sent":"Envoyés","Services":"Services","Session Log":"Journal de session","Session log":"Journal de session","Settings":"Paramètres","Share the love by inviting your friends.":"Partagez l’amour en invitant vos amis.","Show Account":"Montrer le compte","Show more":"En afficher plus","Signing transaction":"Signature de la transaction","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Puisque vous contrôlez votre argent, vous devez sauvegarder votre seed de portefeuille au cas où cette app est supprimée","Skip":"Ignorer","Slide to send":"Faites glisser pour envoyer","Sweep":"Balayer","Sweep paper wallet":"Balayer un portefeuille de papier","Sweeping Wallet...":"Balayage du portefeuille...","THIS ACTION CANNOT BE REVERSED":"CETTE ACTION NE PEUT PAS ÊTRE ANNULÉE","Tap and hold to show":"Appuyez et maintenez pour afficher","Terms Of Use":"Conditions d'utilisation","Terms of Use":"Conditions d'utilisation","Text":"Texte","Thank you!":"Merci !","Thanks!":"Merci !","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Votre avis nous intéresse ! Nous aimerions obtenir une note de 5 étoiles de votre part – comment pourrions-nous améliorer votre expérience ?","The seed":"Le seed","The seed is invalid, it should be 64 characters of: 0-9, A-F":"La graine (seed) n'est pas valide, elle doit faire 64 caractères parmi : 0-9, A-F","The wallet server URL":"URL du serveur-portefeuille","There is an error in the form":"Il y a une erreur dans la forme","There's obviously something we're doing wrong.":"Il y a visiblement quelque chose que nous faisons mal.","This app is fantastic!":"Cette appli est fantastique !","Timeline":"Chronologie","To":"À","Touch ID Failed":"Touch ID a échoué","Transaction":"Transaction","Transfer to":"Transférer à","Transfer to Account":"Transférer vers le compte","Try again in {{expires}}":"Réessayez dans {{expires}}","Uh oh...":"Oh là là...","Update Available":"Mise à jour disponible","Updating... Please stand by":"Mise à jour... veuillez patienter","Verify your identity":"Vérification de votre identité","Version":"Version","View":"Voir","View Terms of Service":"Voir les conditions d'utilisation","View Update":"Voir la mise à jour","Wallet Accounts":"Comptes du portefeuille","Wallet File":"Fichier du portefeuille","Wallet Seed":"Graine du portefeuille","Wallet seed not available":"Graine du portefeuille non disponible","Warning!":"Attention !","Watch out!":"Méfiez-vous !","We'd love to do better.":"Nous serions ravis de faire mieux.","Website":"Site internet","What do you call this account?":"Comment nommez-vous ce compte ?","Would you like to receive push notifications about payments?":"Souhaitez-vous recevoir des notifications relatives aux paiements ?","Yes":"Oui","Yes, skip":"Oui, ignorer","You can change the name displayed on this device below.":"Vous pouvez changer le nom affiché sur cet appareil ci-dessous.","You can create a backup later from your wallet settings.":"Vous pouvez créer une sauvegarde plus tard à partir des paramètres de votre portefeuille.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Vous pouvez voir les derniers développements et contribuer à cette application open source en visitant notre projet sur GitHub.","You can still export it from Advanced &gt; Export.":"Vous pouvez l’exporter depuis le menu « Avancé » &gt; « Exporter ».","You'll receive email notifications about payments sent and received from your wallets.":"Vous recevrez des notifications par e-mail concernant les paiements envoyés et reçus depuis vos portefeuilles.","Your ideas, feedback, or comments":"Vos idées, vos commentaires ou observations","Your password":"Votre mot de passe","Your wallet is never saved to cloud storage or standard device backups.":"Votre portefeuille n’est jamais enregistré en dehors de votre appareil ou dans des sauvegardes qui lui sont propres.","[Balance Hidden]":"[Solde masqué]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"J'ai lu, compris et accepté les <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Conditions générales du contrat</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Une note de 5 étoiles nous permet de mettre Canoe entre les mains de plus de personnes, et plus d'utilisateurs signifie que plus de ressources peuvent être affectées à l'application!","At least 8 Characters. Make it good!":"Au moins 8 caractères, choisissez les biens !","Change Password":"Changer le mot de passe","Confirm New Password":"Confirmez le nouveau mot de passe","How do you like Canoe?":"Que pensez-vous de Canoe ?","Let's Start":"C'est parti !","New Password":"Nouveau mot de passe","Old Password":"Ancien mot de passe","One more time.":"Encore une fois","Password too short":"Mot de passe trop court","Passwords don't match":"Les mots de passe sont différents","Passwords match":"Mots de passe identiques","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Les notifications en push sont désactivées pour Canoe. Veuillez les autoriser dans les préférences.","Share Canoe":"Partager Canoe","There is a new version of Canoe available":"Une nouvelle version de Canoe est disponible","We're always looking for ways to improve Canoe.":"Nous cherchons en permanence à améliorer l'application Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Nous cherchons en permanence à améliorer l'application Canoe. Quelles sont vos suggestions ?","Would you be willing to rate Canoe in the app store?":"Voulez-vous évaluer Canoe dans l'app store ?","Account Alias":"Alias de compte","Account Color":"Couleur de compte","Alias":"Alias","Backup seed":"Sauvegarder la graine","Create Wallet":"Créer un portefeuille","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Vous ne trouvez pas votre langue ? Inscrivez-vous sur POEditor, nous adorerions  ajouter votre langue.","Edit Contact":"Editer le Contact","Enter password":"Saisir le mot de passe","Incorrect password, try again.":"Mot de passe erroné, essayez à nouveau.","Joe Doe":"M. Dupont","Join the future of money,<br>get started with BCB.":"Rejoignez l'argent du futur, <br>essayez BCB.","Lock wallet":"Fermer Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB est différent &ndash; on ne peut pas le garder sûrement dans un compte en banque ou sur un site web.","No accounts available":"Aucun compte disponible","No backup, no BCB.":"Pas de sauvegarde, pas de Nanos.","Open POEditor":"Ouvir POEditor","Open Translation Site":"Ouvrir le site de traduction","Password to decrypt":"Mot de passe pour décrypter","Password to encrypt":"Mot de passe pour encrypter","Please enter a password to use for the wallet":"Veuillez saisir un mot de passe de portefeuille","Repair":"Réparer","Send BCB":"Envoyer des Nanos","Start sending BCB":"Commencer à envoyer des Nanos","To get started, you need BCB. Share your account to receive BCB.":"Pour commencer, vous avez besoin de Nanos. Partagez votre compte pour recevoir des Nanos.","To get started, you need an Account in your wallet to receive BCB.":"Pour commencer, vous avez besoin d'un compte dans votre portefeuille pour recevoir des Nanos.","Type below to see if an alias is free to use.":"Vérifiez si un alias est libre ci-dessous.","Use Server Side PoW":"POW sur le serveur","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Nous sommes toujours à la recherche de contributeurs pour les traductions ! Vous pouvez faire des corrections ou aider à rendre accessible cette application dans votre langue d'origine en rejoignant notre communauté sur POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Vous pouvez contribuer aux traductions en vous inscrivant sur POEditor. Nous attendons votre aide !","You can scan BCB addresses, payment requests and more.":"Vous pouvez scanner des adresses BCB, des demandes de paiement et plus.","Your Bitcoin Black Betanet Wallet is ready!":"Votre portefeuille BCB est prêt !","Your BCB wallet seed is backed up!":"Votre graine de portefeuille BCB est sauvegardée !","Account":"Compte","An account already exists with that name":"Ce nom existe déjà pour un autre compte","Confirm your PIN":"Confirmer le code PIN","Enter a descriptive name":"Saisissez un nom déscriptif","Failed to generate seed QR code":"Échec de la génération du QR code de la graine (seed)","Incorrect PIN, try again.":"Code PIN incorrect, ré-essayez.","Incorrect code format for a seed:":"Mauvais format de graine (seed)","Information":"Information","Not a seed QR code:":"Ce QR code ne correspond pas à une graine (seed) :","Please enter your PIN":"Veuillez saisir un code PIN","Scan this QR code to import seed into another application":"Scannez ce QR code pour importer votre graine dans une autre application","Security Preferences":"Préférences de sécurité","Your current password":"Mot de passe actuel","Your password has been changed":"Votre mot de passe à été modifié","Canoe stores your BCB using cutting-edge security.":"Canoe stocke vos BCB en utilisant une sécurité à l'état de l'art.","Caution":"Attention","Decrypting wallet...":"Déchiffrement du portefeuille...","Error after loading wallet:":"Erreur au chargement du portefeuille :","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Je comprends que si cette application est supprimée, mon portefeuille ne pourra être restauré qu'avec la graine (seed) ou un fichier de sauvegarde de portefeuille.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"L'import d'un portefeuille supprimera votre portefeuille actuel et tout ses comptes. Nous vous conseillons de faire une sauvegarde de votre graine (seed) ou de votre portefeuille avant de charger un autre portefeuille.","Incorrect code format for an account:":"Format incorrect pour une sauvegarde de portefeuille.","Just scan and pay.":"Scannez et payez.","Manage":"Gérer","BCB is Feeless":"BCB est sans frais","BCB is Instant":"BCB est instantané","BCB is Secure":"BCB est sûr","Never pay transfer fees again!":"Ne payez plus jamais de frais de transaction !","Support":"Aide","Trade BCB for other currencies like USD or Euros.":"Changez vos BCB pour une autre monnaie comme l'Euro ou le Dollars.","Transfer BCB instantly to anyone, anywhere.":"Transférez des BCB instantanément, n'importe où, vers n'importe qui.","Account Representative":"Procurateur de compte","Add to address book?":"Ajouter cette adresse au carnet d'adresses?","Alias Found!":"Alias trouvé!","At least 3 Characters.":"Au moins trois charactères","Checking availablity":"Vérification de la disponibilité","Create Alias":"Enregistrez un alias","Creating Alias...":"Création d'alias...","Do you want to add this new address to your address book?":"Voulez-vous ajouter cette adresse dans votre carnet d'adresses?","Edit your alias.":"Editer l'alias.","Editing Alias...":"Edition de l'alias...","Email for recovering your alias":"Email de récupération d'alias","Enter a representative account.":"Compte de procuration.","Error importing wallet:":"Erreur d'import de portefeuille","How to buy BCB":"Acheter des Nanos","How to buy and sell BCB is described at the website.":"La procédure pour acheter des Nanos est décrite sur le site web.","Invalid Alias!":"Alias invalide!","Invalid Email!":"Email invalide!","Let People Easily Find you With Aliases":"Permettez aux gens de vous trouver facilement avec les Aliases!","Link my wallet to my phone number.":"Lier mon portefeuille à mon numéro de téléphone.","Looking up @{{addressbookEntry.alias}}":"Recherche de @{{addressbookEntry.alias}}","Make my alias private.":"Rendre mon alias privé.","Refund":"Rembourser","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Réparer votre portefeuille peut prendre du temps. Cela implique le rechargement de toutes les blockchains associées à votre portefeuille. Etes-vous sur de vouloir réparer ?","Representative":"Procurateur","Representative changed":"Procurateur changé","That alias is taken!":"Cet alias est déjà pris!","The official English Terms of Service are available on the Canoe website.":"Les conditions d'utilisation (en anglais) sont disponibles sur le site getCanoe.","Valid Alias & Email":"Alias&Email valides","View Block on BCB Block Explorer":"Voir le block sur BCB Block Explorer","View on BCB Block Explorer":"Voir sur BCB Block Explorer","What alias would you like to reserve?":"Quel alias voulez-vous réserver?","You can change your alias, email, or privacy settings.":"Vous pouvez modifier votre alias, email, ou préférences de privacité.","Your old password was not entered correctly":"Votre ancien mot de passe n'a pas été saisi correctement","joe.doe@example.com":"pierre.dupont@exemple.fr","joedoe":"pierredupont","Wallet is Locked":"Canoe est verrouillé","Forgot Password?":"Mot de passe oublié?","4-digit PIN":"Code PIN","Anyone with your seed can access or spend your BCB.":"Quiconque connait votre graine peut accéder et utiliser vos Nanos.","Background Behaviour":"Comportement en arrière-plan","Change 4-digit PIN":"Changer de code PIN","Change Lock Settings":"Changer les préférences de verrouillage","Fingerprint":"Emprunte digitale","Go back to onboarding.":"Retour à l'enregistrement","Hard Lock":"Verrouillage dur","Hard Timeout":"Délai de verrouillage dur","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Activé, la preuve de travail (POW) est déléguée au serveur Canoe.\nCette option est désactivée et toujours vraie sur Canoe mobile pour l'instant.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Activé, la liste des transactions récentes apparaît sur la page d'accueil. L'implémentation n'est pas terminée.","Lock when going to background":"Verrouillage au passage en arrière-plan","None":"Aucun","Password":"Mot de passe","Saved":"Enregistré","Soft Lock":"Verrouillage doux","Soft Lock Type":"Type de verrouillage doux","Soft Timeout":"Délai pour le verrouillage doux","Timeout in seconds":"Délai en secondes","Unrecognized data":"Données non reconnues","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Verrouillage dur</h5>\n          Avec le verrouillage dur, Canoe encrypte votre portefeuille et le supprime complètement de la mémoire. Vous ne pouvez pas supprimer le verrouillage dur mais vous pouvez lui donner une valeur très grande.","A new version of this app is available. Please update to the latest version.":"Une nouvelle version de Canoe est disponible. Veuillez mettre Canoe à jour.","Backend URL":"URL de serveur","Change Backend":"Changer de serveur","Change Backend Server":"Changer de serveur","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"L'import d'un portefeuille supprimera de cet appareil votre portefeuille courant et tous ses compte! Si vous avez des fonds dans votre portefeuille, assurez-vous d'avoir fait une sauvegarde. Saisissez 'supprimer' pour confirmer que vous souhaitez supprimer votre portefeuille courant.","Max":"Max","delete":"supprimer","bitcoin.black":"bitcoin.black","Confirm Password":"Confirmer le mot de passe","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Retourner à l'enregistrement supprimera de cet appareil votre portefeuille et ses comptes associés! Si vous avez des fonds dans le portefeuille courant, assurez-vous d'en avoir fais une sauvegarde. Saisissez 'supprimer' pour confirmer que vous voulez supprimer le portefeuille courant.","Please enter a password of at least 8 characters":"Veuillez saisir un mot de passe d'au moins 8 caractères","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"Vous pouvez visualiser l'ensemble de vos comptes sur cet écran. Lisez de notre <a ng-click=\"openExternalLinkHelp()\">FAQs</a> avant de démarrer!","Play Sounds":"Sons activés","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">Comportement en arrière plan</h5>\n            <p translate=\"\">Choisissez le type de verrouillage quand Canoe passe en arrière plan.</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":"<h5 class=\"toggle-label\" translate=\"\">Verrouillage doux</h5>\n          <p translate=\"\">Permet d'utiliser le déverrouillage par code PIN ou par emprunte digitale. A noter: votre portefeuille reste alors non-encrypté en mémoire.</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Choisissez le type de verrouillage quand Canoe passe en arrière plan.","Encryption Time!":"Paré pour l'encryptage","Enter at least 8 characters to encrypt your wallet.":"Veuillez saisir au moins 8 caractères pour encrypter votre portefeuille","Password length ok":"Longueur de mot de passe valide","Passwords do not match":"Les mots de passe ne concordent pas","Unlock":"Déverrouiller","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Le verrouillage doux permet d'utiliser le déverrouillage par code PIN ou par emprunte digitale. A noter: votre portefeuille reste alors non-encrypté en mémoire.","Attributions":"Allocations","Block was scanned and sent successfully":"Le block a été scanné et envoyé","Block was scanned but failed to process:":"Le block a été scanné mais n'a pas pu être traité","Failed connecting to backend":"Erreur de connexion au serveur","Failed connecting to backend, no network?":"Erreur de connexion au serveur, problème réseau ?","Successfully connected to backend":"Connecté au serveur","BCB Account":"Compte BCB","Send BCB to this address":"Envoyer des BCB à cette adresse","Please load BCB to donate":"Veuillez charger des BCB pour pouvoir faire un don"});
    gettextCatalog.setStrings('he', {"A member of the team will review your feedback as soon as possible.":"תגובתך תבדק בידי אחד מאנשי הצוות מוקדם ככלל שניתן","About":"אודות","Account Information":"מאפיינים","Account Name":"שם החשבון","Account Settings":"מאפיינים","Account name":"שם החשבון","Accounts":"חשבונות","Add Contact":"הוסף איש קשר","Add account":"הוסף חשבון","Add as a contact":"הוסף כאיש קשר","Add description":"הוסף תיאור","Address Book":"ספר כתובות","Advanced":"מתקדם","Advanced Settings":"מאפיינים מתקדמים","Allow Camera Access":"אפשר גישת מצלמה","Allow notifications":"אפשר התראות","Almost done! Let's review.":"כמעט סיימנו!, בוא נבדוק","Alternative Currency":"מטבע חלופי","Amount":"סכום","Are you being watched?":"מישהו צופה בך?","Are you sure you want to delete this contact?":"בטוח/ה שברצונך למחוק איש קשר זה?","Are you sure you want to delete this wallet?":"בטוח/ה שברצונך למחוק ארנק זה?","Are you sure you want to skip it?":"בטוח/ה שברצונך לדלג?","Backup Needed":"דרוש גיבוי","Backup now":"גבה עכשיו","Backup wallet":"גבה את הארנק","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"תשמור את הסיד שלך במקום מאובטח, אם הסיד שלך ימחק או המכשיר שלך יגנב, הסיד יהיה הדרך היחידה לשחזר של החשבון שלך.","Browser unsupported":"דפדפן לא נתמך","But do not lose your seed!":"אבל אל תאבד את הסיד שלך!","Cancel":"ביטול","Cannot Create Wallet":"לא מצליח לייצר ארנק","Choose a backup file from your computer":"בחר/י קובץ גיבוי מהמחשב","Click to send":"לחץ לשליחה","Close":"סגור","Coin":"מטבע","Color":"צבע","Confirm":"אשר","Contacts":"אנשי קשר","Continue":"המשך","Contribute Translations":"תרום תרגומים","Copied to clipboard":"הועתק לשורת ההעתקה","Copy this text as it is to a safe place (notepad or email)":"העתק טקסט זה למקום בטוח (דף נייר חיצוני לדוגמא)","Copy to clipboard":"העתק לשורת ההעתקה","Could not access the wallet at the server. Please check:":"לא נתאפשרה גישה לארנק בשרת. אנא בדוק:","Create Account":"צור חשבון","Create new account":"צור חשבון חדש","Creating Wallet...":"יוצר ארנק..","Creating account...":"יוצר חשבון..","Creating transaction":"יוצר העברה..","Date":"תאריך","Default Account":"שחבון ברירת מחדל","Delete":"מחק","Delete Account":"מחק חשבון","Delete Wallet":"מחק ארנק","Deleting Wallet...":"מוחק ארנק..","Do it later":"בצע לאחר מכן","Donate to Bitcoin Black":"תרום/תרמי ל Canoe ","Download":"הורד","Edit":"ערוך","Email":"אי-מייל","Email Address":"כתובת אי-מייל","Enable camera access in your device settings to get started.":"אפשר גישת מצלמה במאפיינים על מנת להתחיל","Enable email notifications":"אפשר התראות דואר אלקטרוני","Enable push notifications":"אפשר התראות-פוש","Enable the camera to get started.":"אפשר גישת מצלמה על מנת להתחיל","Enter amount":"הכנס סכום","Enter wallet seed":"הכנס סיד לארנק","Enter your password":"הכנס סיסמא","Error":"טעות","Error at confirm":"שגיאה באישור","Export wallet":"ייצא ארנק","Extracting Wallet information...":"שולף מידע מארנק..","Failed to export":"ייצוא נכשל","Family vacation funds":"כספי חופשה משפחתית","Feedback could not be submitted. Please try again later.":"נכשלה שליחת תגובתך. אנא נס/י שנית מאוחר יותר","File/Text":"קובץ/טקסט","Filter setting":"הגדרות סינון","Finger Scan Failed":"סריקת אצבע נכשלה","Finish":"סיים","From":"מ","Funds transferred":"כספים הועברו","Funds will be transferred to":"כספים יועברו ל","Get started":{"button":"התחל"},"Go Back":"חזור","Go back":"חזור","Got it":"הבנתי","Help & Support":"עזרה ותמיכה","Help and support information is available at the website.":"מידע לעזרה ותמיכה זמין באתר","Hide Balance":"הסתר מאזן","Home":"בית","How could we improve your experience?":"כיצד ניתן לשפר את חוויתך?","I don't like it":"לא אהבתי","I have read, understood, and agree with the Terms of use.":"קראתי הבנתי ואני מסכים לתנאי השימוש","I like the app":"אהבתי","I think this app is terrible.":"האפליקציה הזאת נוראית.","I understand":"אני מבין","I've written it down":"אני יכתוב את זה","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"אם מכשיר זה יוחלף או האפליקציה תימחק, לא תוכל לגשת ליתרה שלך בלי גיבוי.","Import Wallet":"ייבא ארנק","Import seed":"ייבא סיד","Import wallet":"ייבא ארנק","Importing Wallet...":"מייבא את הארנק...","In order to verify your wallet backup, please type your password.":"על מנת שנוכל לאמת את הגיבוי שלך, בבקשה הכנס את הסיסמה שלך.","Incomplete":"לא הושלם","Insufficient funds":"אין מספיק יתרה","Invalid":"לא תקין","Is there anything we could do better?":"יש משהו שאנחנו יכולים לשפר?","Language":"שפה","Learn more":"למד עוש","Loading transaction info...":"טוען פרטי העברה...","More Options":"אפשרויות נוספות","Name":"שם","New account":"חשבון חדש","No Account available":"אין חשבון זמין","No contacts yet":"לא הוספתה עדיין אנשי קשר","No transactions yet":"אין עדיין העברות","No wallet found":"לא נמצא ארנק","No wallet selected":"לא נבחר ארנק","No wallets available to receive funds":"אין ארנקים זמינים לקבל העברות","Not funds found":"לא נמצאה יתרה","Not now":"לא עכשיו","Note":"הערה","Notifications":"התראות","Notify me when transactions are confirmed":"הודע לי כאשר העברות מאושרות","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"עכשיו זה זמן טוב לגבות את הארנק שלך. אם מכשיר זה יאבד, לא יהיה ניתן לשחזר את החשבון ללא גיבוי.","OK":"אישור","OKAY":"אישור","Oh no!":"אוי לא!","Open":"פתח","Open GitHub":"פתח את גיטהאב","Open GitHub Project":"פתח את הפרויקט גיטהאב","Open Settings":"פתח את ההגדרות","Open Website":"פתח את האתר","Open website":"פתח את האתר","Payment Accepted":"העברה התקבלה","Payment Received":"ההעברה התקבלה","Payment Rejected":"ההעברה נדחתה","Payment Sent":"העברה נשלחה","Please enter the seed":"בבקשה הכנס סיד","Please, select your backup file":"בבקשה בחר את קובץ הגיבוי שלך","Preferences":"העדפות","Press again to exit":"לחץ שוב ליציאה","Private Key":"מפתח פרטי","Private key encrypted. Enter password":"פתח פרטי הוצפן. הכנס סיסמה","Push Notifications":"התראות","QR Code":"QR קוד","Quick review!":"סקירה מהירה!","Rate on the app store":"דרג בחנות האפליקציות","Receive":"קבל","Received":"התקבל","Recent":"לאחרונה","Recent Transactions":"העברות אחרונות","Recipient":"נמען","Remove":"הסר","Restore from backup":"שחזר מגיבוי","Retry":"נסה שוב","Save":"שמור","Scan":"סרוק","Scan QR Codes":"סרוק קוד QR","Scan again":"סרוק שוב","Scanning Wallet funds...":"סורק לאיתור ייתרה...","Search Transactions":"חפש העברה","Search or enter account number":"חפש או הקלד מספר חשבון","Search transactions":"חפש העברות","Search your currency":"חפש את המטבע שלך","Select a backup file":"בחר קובץ גיבוי","Select an account":"בחר חשבון","Send":"שלח","Send Feedback":"שלח חוות דעת","Send by email":"שלח באמצעות מייל","Send from":"שלח מ","Send max amount":"שלח כמות מקסימלית","Send us feedback instead":"שלח לנו חוות דעת במקום","Sending":"שולח","Sending feedback...":"שולח חוות דעת..","Sending maximum amount":"שולח כמות מקסימלית","Sending transaction":"שולח העברה","Sending {{amountStr}} from your {{name}} account":"שולח {{amountStr}} מחשבון: {{name}}","Sent":"נשלח","Services":"שירותים","Settings":"הגדרות","Show Account":"הראה חשבון","Show more":"הראה עוד","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"מכוון שרק אתה שולט בכסף שלך, אתה צריך לשמור את הסיד שלך למקרה שהאפליקציה תימחק.","Skip":"דלג","Slide to send":"החלק לשלוח","Tap and hold to show":"לחץ והחזק לצפות","Terms Of Use":"תנאי שימוש","Terms of Use":"תנאי שימוש","Text":"טקסט","Thank you!":"תודה!","Thanks!":"תודה!","The seed":"הסיד שלך","The wallet server URL":"כתובת השרת של הארנק","There is an error in the form":"ישנה שגיאה בטופס","To":"ל","Transaction":"העברה","Transfer to":"העבר אל","Transfer to Account":"העבר לחשבון","Try again in {{expires}}":"נסה שוב בעוד {{expires}}","Uh oh...":"אוי לא...","Update Available":"עדכון זמין","Verify your identity":"אמת את הזהות שלך","Version":"גרסה","View":"צפה","View Terms of Service":"צפה בתנאי השימוש","View Update":"צפה בעדכון","Wallet Accounts":"חשבונות של ארנק זה","Wallet Seed":"הסיד של הארנק","Wallet seed not available":"הסיד של הארנק לא זמין","Warning!":"אזהרה!","Watch out!":"היזהר!","Website":"אתר","What do you call this account?":"איך אתה קורה לחשבון זה?","Yes":"כן","Yes, skip":"כן, דלג","Your password":"הסיסמה שלך","[Balance Hidden]":"[יתרה מוסתרת]","At least 8 Characters. Make it good!":"לפחות 8 תווים. תעשה את זה טוב!","Change Password":"שנה סיסמה","Confirm New Password":"אמת את הסיסמה החדשה","Let's Start":"בוא נתחיל","New Password":"סיסמה חדשה","Old Password":"סיסמה ישנה","One more time.":"עוד פעם אחת.","Password too short":"הסיסמה קצרה מידי","Passwords don't match":"הסיסמאות לא תואמות","Passwords match":"הסיסמאות תואמות","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"ההתראות כבויות כעת. הפעל אותם דרך תפריט ההגדרות.","Share Canoe":"שתף את קאנו","There is a new version of Canoe available":"גרסה חדשה של קאנו זמינה","We're always looking for ways to improve Canoe.":"אנחנו תמיד מחפשים דרכים לשפר את קאנו.","Account Color":"צבע חשבון","Create Wallet":"צור ארנק","Edit Contact":"ערוך איש קשר","Enter password":"הכנס סיסמה","Incorrect password, try again.":"סיסמה שגויה, נסה שנית.","Joe Doe":"ישראל ישראלי","Lock wallet":"נעל את קאנו","No accounts available":"אין חשבונות זמינים","No backup, no BCB.":"אין גיבוי, אין נאנו","Open Translation Site":"פתח אתר תרגומים","Please enter a password to use for the wallet":"בבקשה הכנס סיסמה להשתמש בארנק","Repair":"תקן","Send BCB":"שלח נאנו","Use Server Side PoW":"בצע חישוב דרך השרת","You can scan BCB addresses, payment requests and more.":"אתה יכול לסרוק חשבונות נאנו, בקשות תשלום ועוד.","Your Bitcoin Black Betanet Wallet is ready!":"הארנק נאנו שלך מוכן!","Your BCB wallet seed is backed up!":"הסיד של הארנק נאנו מגובה!","Account":"חשבון","An account already exists with that name":"קיים כבר חשבון עם השם הזה","Confirm your PIN":"אמת את הקוד שלך","Enter a descriptive name":"הכנס תיאור לשם","Incorrect PIN, try again.":"קוד לא נכון, נסה שנית","Information":"מידע","Please enter your PIN":"בבקשה הכנס את הקוד שלך","Scan this QR code to import seed into another application":"סרוק את הQR קוד הזה לייבא את הסיד לאפליקציה אחרת","Security Preferences":"הגדרות אבטחה","Your current password":"הסיסמה הנוכחית שלך","Your password has been changed":"הסיסמה שלך שונתה","Canoe stores your BCB using cutting-edge security.":"קאנו שומר את הנאנו שלך בטכנולוגית האבטחה המתקדמת ביותר.","Caution":"זהירות","Error after loading wallet:":"שגיאה לאחר טעינת הארנק:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"אני מבין שאם אפליקציה זו נמחקת, אני יוכל לשחזר את החשבון שלי רק באמצעות הסיד שלי או הקובץ גיבוי של הארנק.","Just scan and pay.":"פשוט סרוק ושלם.","BCB is Feeless":"נאנו ללא עמלות","BCB is Instant":"נאנו מידי","BCB is Secure":"נאנו מאובטח","Never pay transfer fees again!":"לעולם לא תשלם יותר עמלות!","Support":"תמיכה","Trade BCB for other currencies like USD or Euros.":"החלף נאנו למטבעות אחרים כמו דולר או אירו","At least 3 Characters.":"לפחות 3 תווים.","Do you want to add this new address to your address book?":"אתה רוצה להוסיף כתובת חדשה זו לספר הכתובות שלך?","How to buy BCB":"איך לקנות נאנו?","Invalid Email!":"מייל לא תקין!","joe.doe@example.com":"joe.doe@example.com","joedoe":"joedoe","Wallet is Locked":"קאנו נעול","Forgot Password?":"שכחתה את הסיסמה?","4-digit PIN":"קוד 4 תווים","Change 4-digit PIN":"שנה קוד 4 תווים","Change Lock Settings":"שנה הגדרות נעילה","Fingerprint":"טביעת אצבע","Password":"סיסמה","Saved":"נשמר","Timeout in seconds":"דילאי בשניות","Unrecognized data":"מידע לא מוכר"});
    gettextCatalog.setStrings('hr', {"A member of the team will review your feedback as soon as possible.":"Član tima pregledat će vaše povratne informacije što je prije moguće.","About":"Otprilike","Account Information":"Informacije o računu","Account Name":"Korisničko ime","Account Settings":"Postavke računa","Account name":"Korisničko ime","Accounts":"Računi","Add Contact":"Dodajte kontakt","Add account":"Dodajte račun","Add as a contact":"Dodajte kao kontakt","Add description":"Dodajte opis","Address Book":"Adresar","Advanced":"Napredno","Advanced Settings":"Napredne postavke 💻","Allow Camera Access":"Dopustite pristup kameri 📷","Allow notifications":"Dopustite obavijesti","Almost done! Let's review.":"Skoro gotovo! Pogledajmo.","Alternative Currency":"Alternativna valuta","Amount":"Iznos","Are you being watched?":"Jeli vas netko promatra? 👀","Are you sure you want to delete this contact?":"Jeste li sigurni da želite izbrisati taj kontakt?","Are you sure you want to delete this wallet?":"Jeste li sigurni da želite izbrisati taj novčanik?","Are you sure you want to skip it?":"Jeste li sigurni da želite preskočiti?","Backup Needed":"Potrebna je sigurnosna kopija","Backup now":"Napravi sigurnosnu kopiju","Backup wallet":"Sigurnosni novčanik","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Svakako spremite svoje sjeme (seed) na sigurno mjesto. Ako je ova aplikacija izbrisana ili vaš uređaj ukraden, sjeme (seed) je jedini način za ponovno stvaranje novčanika.","Browser unsupported":"Preglednik nije podržan","But do not lose your seed!":"Ali nemojte izgubiti svoje sjeme (seed)!","Buy &amp; Sell Bitcoin":"Kupite & amp; Prodaj Bitcoin","Cancel":"Otkazati","Cannot Create Wallet":"Nije moguće stvoriti novčanik","Choose a backup file from your computer":"Odaberite datoteku sigurnosne kopije s računala","Click to send":"Kliknite za slanje","Close":"Zatvoriti","Coin":"Novčić","Color":"Boja","Commit hash":"Pričekajte hash","Confirm":"Potvrdite","Confirm &amp; Finish":"Potvrdite &amp; Završi","Contacts":"Kontakti","Continue":"Nastaviti","Contribute Translations":"Doprinos prijevodima","Copied to clipboard":"Kopirano je u međuspremnik","Copy this text as it is to a safe place (notepad or email)":"Kopirajte ovaj tekst kao na sigurno mjesto (notepad ili e-mail)","Copy to clipboard":"Kopirati u međuspremnik","Could not access the wallet at the server. Please check:":"Nije moguće pristupiti novčaniku na poslužitelju. Provjerite:","Create Account":"Stvorite račun","Create new account":"Stvorite novi račun","Creating Wallet...":"Izrada novčanika ...","Creating account...":"Izrada računa ...","Creating transaction":"Stvaranje transakcije","Date":"Datum","Default Account":"Zadani račun","Delete":"Izbrisati","Delete Account":"Izbrisati račun","Delete Wallet":"Izbrisati Novčanik","Deleting Wallet...":"Brisanje novčanika ...","Do it later":"Učinite to kasnije","Donate to Bitcoin Black":"Donirajte Canoe-u","Download":"Preuzimanje datoteka","Edit":"Uredi","Email":"E-mail","Email Address":"Email adresa","Enable camera access in your device settings to get started.":"Da biste započeli, omogućite pristup fotoaparatu u postavkama uređaja.","Enable email notifications":"Omogući obavijesti e-poštom","Enable push notifications":"Omogući push obavijesti","Enable the camera to get started.":"Omogućite pokretanje kamere.","Enter amount":"Unesite iznos","Enter wallet seed":"Unesite sjeme (seed) novčanika","Enter your password":"Upišite svoju lozinku","Error":"Greška","Error at confirm":"Pogreška pri potvrdi","Error scanning funds:":"Pogreška pri skeniranju sredstava:","Error sweeping wallet:":"Pogreška pri korištenju novčanika:","Export wallet":"Izvoz novčanika","Extracting Wallet information...":"Izdvajanje informacija o novčaniku ...","Failed to export":"Izvoz nije uspio","Family vacation funds":"Obiteljski odmor sredstava","Feedback could not be submitted. Please try again later.":"Nije bilo moguće slati povratne informacije. Molimo pokušajte ponovo kasnije.","File/Text":"Datoteka/Tekst","Filter setting":"Postavka filtra","Finger Scan Failed":"Prst skeniranje nije uspjelo","Finish":"Završi","From":"Iz","Funds found:":"Pronađena sredstva:","Funds transferred":"Prijenos sredstava","Funds will be transferred to":"Sredstva će biti prenesena u","Get started":{"button":"Započnite"},"Get started by adding your first one.":"Započnite s dodavanjem prvog.","Go Back":"Vratite se","Go back":"Vratite se","Got it":"Dobio sam to","Help & Support":"Pomoć i Podrška","Help and support information is available at the website.":"Informacije o pomoći i podršci dostupne su na web stranici.","Hide Balance":"Sakriti saldo","Home":"Na početak","How could we improve your experience?":"Kako bismo mogli poboljšati vaše iskustvo?","I don't like it":"Ne sviđa mi se","I have read, understood, and agree with the Terms of use.":"Pročitao sam, razumio i slažem se s Uvjetima korištenja.","I like the app":"Sviđa mi se aplikacija","I think this app is terrible.":"Mislim da je ova aplikacija strašna.","I understand":"Razumijem","I understand that my funds are held securely on this device, not by a company.":"Razumijem da se moja sredstva sigurno drže na ovom uređaju, a ne od strane tvrtke.","I've written it down":"Zapisao sam to","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Ako je ovaj uređaj zamijenjen ili je ta aplikacija izbrisana, sredstva se ne mogu vratiti bez sigurnosne kopije.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Ako imate dodatnih povratnih informacija, obavijestite nas tako da dodirnete opciju \"Pošalji povratne informacije\" na kartici Postavke.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Ako snimite snimak zaslona, ​​druge aplikacije mogu pregledavati sigurnosnu kopiju. Možete napraviti sigurnu sigurnosnu kopiju s fizičkim papirom i olovkom.","Import Wallet":"Uvoz novčanika","Import seed":"Uvoz sjemena (seed)","Import wallet":"Uvezite novčanik","Importing Wallet...":"Uvoz novčanika ...","In order to verify your wallet backup, please type your password.":"Da biste potvrdili sigurnosnu kopiju novčanika, unesite zaporku.","Incomplete":"Nepotpuno","Insufficient funds":"Nedovoljno sredstva","Invalid":"Neispravno","Is there anything we could do better?":"Postoji li nešto što bismo mogli učiniti bolje?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Važno je da ispravno napišete sjeme (seed) novčanika. Ako se nešto dogodi vašem novčaniku, trebat će vam ovo sjeme (seed) za rekonstrukciju. Pregledajte vaše sjeme (seed) i pokušajte ponovo.","Language":"Jezik","Learn more":"Saznajte više","Loading transaction info...":"Učitavanje informacija o transakciji ...","Log options":"Mogućnosti zapisnika","Makes sense":"Ima smisla","Matches:":"Odgovara:","Meh - it's alright":"Meh - sve je u redu","Memo":"Memorandum","More Options":"Više mogućnosti","Name":"Ime","New account":"Novi profil","No Account available":"Nije dostupan račun","No contacts yet":"Još nema kontakata","No entries for this log level":"Nema unosa za ovu razinu dnevnika","No recent transactions":"Nema nedavnih transakcija","No transactions yet":"Još nema transakcija","No wallet found":"Nije pronađen novčanik","No wallet selected":"Nije odabran novčanik","No wallets available to receive funds":"Nema novčanika na raspolaganju za primanje sredstava","Not funds found":"Nisu pronađena sredstva","Not now":"Ne sada","Note":"Bilješka","Notifications":"Obavijesti","Notify me when transactions are confirmed":"Obavijesti me kada su potvrđene transakcije","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Sada je dobro vrijeme za sigurnosno kopiranje novčanika. Ako je ovaj uređaj izgubljen, nemoguće je pristupiti svojim sredstvima bez sigurnosne kopije.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Sada je savršeno vrijeme za procjenu vaše okoline. Prozori u blizini? Skrivene kamere? Špijuni iza vas? UDBA? ","Numbers and letters like 904A2CE76...":"Brojevi i slova poput 904A2CE76 ...","OK":"U redu","OKAY":"U REDU","Official English Disclaimer":"Odricanje od odgovornosti","Oh no!":"O ne!","Open":"Otvoren","Open GitHub":"Otvorite GitHub","Open GitHub Project":"Otvori GitHub projekt","Open Settings":"Otvorite Postavke","Open Website":"Otvori web stranicu","Open website":"Otvori web stranicu","Paste the backup plain text":"Zalijepite tekst običnog kopiranja","Payment Accepted":"Prihvaćeno plaćanje","Payment Proposal Created":"Izrađen prijedlog plaćanja","Payment Received":"Primljena uplata","Payment Rejected":"Odbijeno plaćanje","Payment Sent":"Plaćanje je poslano","Permanently delete this wallet.":"Trajno izbrišite ovaj novčanik.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Pažljivo zapišite sjeme (seed) od 64 znaka. Kliknite da biste kopirali u međuspremnik.","Please connect a camera to get started.":"Povežite fotoaparat kako biste započeli.","Please enter the seed":"Unesite sjeme (seed)","Please, select your backup file":"Odaberite sigurnosnu kopiju datoteke","Preferences":"Postavke","Preparing addresses...":"Pripremanje adresa ...","Preparing backup...":"Priprema sigurnosne kopije ...","Press again to exit":"Pritisnite ponovno za izlaz","Private Key":"Privatni ključ","Private key encrypted. Enter password":"Privatni ključ šifriran. Upišite lozinku","Push Notifications":"Push Obavijesti","QR Code":"QR kod","Quick review!":"Brzi pregled!","Rate on the app store":"Ocijenite u trgovini aplikacija","Receive":"Primi","Received":"Primljeno","Recent":"Nedavno","Recent Transaction Card":"Nedavna transakcijska kartica","Recent Transactions":"Nedavne transakcije","Recipient":"Primaoc","Release information":"Objavite informacije","Remove":"Ukloniti","Restore from backup":"Vraćanje iz sigurnosne kopije","Retry":"Pokušaj ponovno","Retry Camera":"Pokušaj ponoviti kameru","Save":"Uštedjeti","Scan":"Skenirati","Scan QR Codes":"Skeniranje QR kodova","Scan again":"Ponovno skeniranje","Scan your fingerprint please":"Skenirajte svoj otisak prsta","Scanning Wallet funds...":"Skeniranje novčanih sredstava ...","Screenshots are not secure":"Snimke zaslona nisu sigurne","Search Transactions":"Pretraživanje transakcija","Search or enter account number":"Pretraživanje ili unos broja računa","Search transactions":"Pretraživanje transakcija","Search your currency":"Pretražite svoju valutu","Select a backup file":"Odaberite datoteku sigurnosne kopije","Select an account":"Odaberite račun","Send":"Pošalji","Send Feedback":"Pošalji povratne informacije","Send by email":"Pošalji e-mailom","Send from":"Pošalji od","Send max amount":"Pošalji maksimalni iznos","Send us feedback instead":"Pošaljite nam povratne informacije","Sending":"Slanje","Sending feedback...":"Slanje povratnih informacija ...","Sending maximum amount":"Slanje maksimalnog iznosa","Sending transaction":"Slanje transakcije","Sending {{amountStr}} from your {{name}} account":"Slanje {{amountStr}} s računa {{name}}","Sent":"Poslano","Services":"Usluge","Session Log":"Zapisnik sesije","Session log":"Zapisnik sesije","Settings":"Postavke","Share the love by inviting your friends.":"Podijelite ljubav pozivajući svoje prijatelje.","Show Account":"Prikaži račun","Show more":"Prikaži više","Signing transaction":"Potpisivanje transakcije","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Budući da samo vi kontrolirate svoj novac, trebat ćete spremiti sjeme (seed) novčanika u slučaju uklanjanja ove aplikacije.","Skip":"Preskočiti","Slide to send":"Pomaknite za slanje","Sweep":"Pomesti","Sweep paper wallet":"Ispišite papirni novčanik","Sweeping Wallet...":"Potporni novčanik ...","THIS ACTION CANNOT BE REVERSED":"OVU AKCIJU NE MOŽE SE PREOKRENUTI","Tap and hold to show":"Dodirnite i držite za prikaz","Terms Of Use":"Uvjeti korištenja","Terms of Use":"Uvjeti korištenja","Text":"Tekst","Thank you!":"Hvala vam!","Thanks!":"Hvala!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"To je uzbudljivo čuti. Voljeli bismo dobiti tu petu zvijezdu od vas - kako bismo mogli poboljšati vaše iskustvo?","The seed":"Sjeme (seed)","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Sjeme (seed) je nevažeće, trebalo bi biti 64 znaka: 0-9, A-F","The wallet server URL":"URL poslužitelja novčanika","There is an error in the form":"Postoji pogreška u obrascu","There's obviously something we're doing wrong.":"Očito je nešto što radimo pogrešno.","This app is fantastic!":"Ova aplikacija je fantastična!","Timeline":"Vremenska Crta","To":"Do","Touch ID Failed":"ID osjetljiv na dodir nije uspio","Transaction":"Transakcija","Transfer to":"Prijelaz na","Transfer to Account":"Prijenos na račun","Try again in {{expires}}":"Pokušajte ponovo u {{expires}}","Uh oh...":"Uh oh...","Update Available":"Ažuriranje dostupno","Updating... Please stand by":"Ažuriranje ... Molim te pričekajte","Verify your identity":"Potvrdite svoj identitet","Version":"Verzija","View":"Pogled","View Terms of Service":"Pogledajte Uvjete pružanja usluge","View Update":"Prikaži ažuriranje","Wallet Accounts":"Računi za Novčanik","Wallet File":"Datoteka novčanika","Wallet Seed":"Sjeme (seed) novčanika","Wallet seed not available":"Sjeme (seed) novčanika nije dostupno","Warning!":"Upozorenje!","Watch out!":"Pazi!","We'd love to do better.":"Voljeli bismo bolje.","Website":"Web stranica","What do you call this account?":"Kako zovete ovaj račun?","Would you like to receive push notifications about payments?":"Želite li primati push obavijesti o plaćanjima?","Yes":"Da","Yes, skip":"Da, preskočite","You can change the name displayed on this device below.":"U nastavku možete promijeniti naziv prikazan na ovom uređaju.","You can create a backup later from your wallet settings.":"Kasnije možete izraditi sigurnosnu kopiju iz postavki lisnice.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Možete vidjeti najnovija dostignuća i pridonijeti ovoj open source aplikaciji posjetom našem projektu na GitHubu.","You can still export it from Advanced &gt; Export.":"I dalje ga možete izvesti iz naprednih & gt; Izvoz.","You'll receive email notifications about payments sent and received from your wallets.":"Primat ćete obavijesti e-poštom o plaćanjima koja su poslana i primljena od vaših novčanika.","Your ideas, feedback, or comments":"Vaše ideje, povratne informacije ili komentari","Your password":"Vaša lozinka","Your wallet is never saved to cloud storage or standard device backups.":"Vaš novčanik nikad nije spremljen u pohranu oblaka ili standardne sigurnosne kopije uređaja.","[Balance Hidden]":"[Saldo Skriven]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Pročitao sam, razumio i prihvaćam <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\"> Uvjete upotrebe usluge </a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Ocjene od 5 zvjezdica pomažu nam da se Canoe dovede u više ruku, a više korisnika znači da se više resursa može predati aplikaciji!","At least 8 Characters. Make it good!":"Najmanje 8 znakova. Neka bude dobra!","Change Password":"Promjeni lozinku","Confirm New Password":"Potvrdi Novu Lozinku","How do you like Canoe?":"Kako Vam se sviđa Canoe?","Let's Start":"Počnimo","New Password":"Nova Lozinka","Old Password":"Stara Lozinka","One more time.":"Još jednom.","Password too short":"Lozinka prekratka","Passwords don't match":"Lozinke se ne podudaraju","Passwords match":"Lozinke se podudaraju","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Push notifikacije su trenutno isključene. Uključite ih ","Share Canoe":"Podijeli Canoe","There is a new version of Canoe available":"Dostupna je nova verzija Canoe","We're always looking for ways to improve Canoe.":"Uvijek tražimo način kako poboljšati Canoe","We're always looking for ways to improve Canoe. How could we improve your experience?":"Uvijek tražimo načine kako poboljšati kanu. Kako bismo mogli poboljšati vaše iskustvo?","Would you be willing to rate Canoe in the app store?":"Biste li bili voljni ocijeniti Canoe u trgovini aplikacija?","Account Alias":"Alias ​​računa","Account Color":"Boja Računa","Alias":"pseudonim","Backup seed":"Sigurnosno sjeme","Create Wallet":"Napravi Novčanik","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Ne vidite svoj jezik? Prijavite se na POEditor! Voljeli bismo podržati vaš jezik.","Edit Contact":"Uredi kontakt","Enter password":"Unesite lozinku","Incorrect password, try again.":"Netočna lozinka, pokušajte ponovo.","Joe Doe":"Joe Doe","Join the future of money,<br>get started with BCB.":"Pridružite se budućnosti novca, <br> počnite s Nanoom.","Lock wallet":"Zaključaj Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB je drugačiji & ndash; ne može se sigurno držati u banci ili web servisu.","No accounts available":"Nema dostupnih računa","No backup, no BCB.":"Nema sigurnosne kopije, nema BCB.","Open POEditor":"Otvorite POEditor","Open Translation Site":"Otvori prijevodnu stranicu","Password to decrypt":"Lozinka za dešifriranje","Password to encrypt":"Zaporka za šifriranje","Please enter a password to use for the wallet":"Unesite zaporku za upotrebu novčanika","Repair":"Popravi","Send BCB":"Pošalji BCB","Start sending BCB":"Počni slati BCB","To get started, you need BCB. Share your account to receive BCB.":"Da biste započeli, trebate BCB. Podijelite svoj račun kako biste primali BCB.","To get started, you need an Account in your wallet to receive BCB.":"Da biste započeli, potreban vam je račun u novčaniku za primanje BCB.","Type below to see if an alias is free to use.":"U nastavku upišite da li je pseudonim slobodan za upotrebu.","Use Server Side PoW":"Koristite PoW na strani poslužitelja","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Uvijek tražimo doprinose za prijevod! Možete izvršiti ispravke ili pomoć kako biste ovu aplikaciju učinili dostupnom na vašem materinskom jeziku tako što ćete se pridružiti našoj zajednici na POEditoru.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Možete uplatiti doprinose prijavom na naš POEditor projekt prevođenja zajednice. Radujemo se što ćemo vam čuti!","You can scan BCB addresses, payment requests and more.":"Možete skenirati BCB adrese, zahtjeve za plaćanje i još mnogo toga.","Your Bitcoin Black Betanet Wallet is ready!":"Vaš BCB Novčanik je spreman!","Your BCB wallet seed is backed up!":"Sjeme vašeg BCB novčanika je poduprto!","Account":"Račun","An account already exists with that name":"Račun već postoji s tim imenom","Confirm your PIN":"Potvrdite svoj PIN","Enter a descriptive name":"Unesite opisno ime","Failed to generate seed QR code":"Nije uspjelo generiranje QR koda sjemena","Incorrect PIN, try again.":"Neispravan PIN, pokušajte ponovo.","Incorrect code format for a seed:":"Netočan format koda za sjeme:","Information":"Informacija","Not a seed QR code:":"Nije sjeme QR kod:","Please enter your PIN":"Molim unesite svoj PIN","Scan this QR code to import seed into another application":"Skenirajte ovaj QR kôd za uvoz sjemena u drugu aplikaciju","Security Preferences":"Sigurnosne postavke","Your current password":"Vaša trenutna lozinka","Your password has been changed":"Vaša lozinka je promijenjena","Canoe stores your BCB using cutting-edge security.":"Canoe pohranjuje vaš BCB koristeći vrhunsku sigurnost.","Caution":"Oprez","Decrypting wallet...":"Dekriptiranje novčanika...","Error after loading wallet:":"Pogreška prilikom učitavanja novčanika:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Razumijem da ako se ova aplikacija briše, moja novčanica može se vratiti samo s podizanjem datoteke sjemena ili lisnice.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Uvoz novčanika uklanja trenutni novčanik i sve svoje račune. Možda biste poželjeli prvo sigurnosno kopirati svoje trenutno sjeme ili napraviti sigurnosnu kopiju datoteke novčanika.","Incorrect code format for an account:":"Neispravan oblik koda za račun:","Just scan and pay.":"Samo skeniraj i plati.","Manage":"Upravljati","BCB is Feeless":"BCB je besprijekoran","BCB is Instant":"BCB je Instantan","BCB is Secure":"BCB je Siguran","Never pay transfer fees again!":"Nemojte nikada ponovno platiti transferne naknade!","Support":"Podrška","Trade BCB for other currencies like USD or Euros.":"Trade BCB za druge valute kao što su USD ili Euro.","Transfer BCB instantly to anyone, anywhere.":"Prijenos Nanoa odmah bilo kome, bilo gdje.","Account Representative":"Predstavnik računa","Add to address book?":"Dodati u adresar?","Alias Found!":"Alias ​​pronađen!","At least 3 Characters.":"Najmanje 3 znaka.","Checking availablity":"Provjeravam dostupnost","Create Alias":"Napravite Alias","Creating Alias...":"Izrada alata ...","Do you want to add this new address to your address book?":"Želite li dodati ovu novu adresu u adresar?","Edit your alias.":"Uredite svoj pseudonim.","Editing Alias...":"Uređivanje alata ...","Email for recovering your alias":"E-pošta za oporavak vašeg pseudom","Enter a representative account.":"Unesite reprezentativni račun.","Error importing wallet:":"Pogreška prilikom uvoza novčanika:","How to buy BCB":"Kako kupiti BCB","How to buy and sell BCB is described at the website.":"Kako kupiti i prodati BCB je opisano na web stranici.","Invalid Alias!":"Nevažeći Alias!","Invalid Email!":"Nevažeći email!","Let People Easily Find you With Aliases":"Neka vas ljudi lakše nađu s nadimcima","Link my wallet to my phone number.":"Povezivanje lisnice na moj telefonski broj.","Looking up @{{addressbookEntry.alias}}":"Gledajući gore @ {{addressbookEntry.alias}}","Make my alias private.":"Napravite moj alias privatnim.","Refund":"Povrat","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Popravak novčanika može potrajati neko vrijeme. To će ponovno učitati sve blokade povezane s novčanikom. Jeste li sigurni da želite popraviti?","Representative":"Predstavnik","Representative changed":"Predstavnik promijenjen","That alias is taken!":"Taj pseudonim je preuzet!","The official English Terms of Service are available on the Canoe website.":"Službeni engleski Uvjeti pružanja usluge dostupni su na web stranici kanjona.","Valid Alias & Email":"Valjani Alias ​​& Email","View Block on BCB Block Explorer":"Prikaži Blok na BCB Block Explorer","View on BCB Block Explorer":"Pogled na BCB Block Explorer","What alias would you like to reserve?":"Koji biste se zanimao rezervirati?","You can change your alias, email, or privacy settings.":"Možete promijeniti svoje pseudonim, e-poštu ili postavke privatnosti.","Your old password was not entered correctly":"Vaša stara lozinka nije ispravno unesena","joe.doe@example.com":"joe.doe@example.com","joedoe":"joedoe","Wallet is Locked":"Canoe je Zaključan","Forgot Password?":"Zaboravili ste Lozinku?","4-digit PIN":"4-znamenkasti PIN","Anyone with your seed can access or spend your BCB.":"Svatko s vašim sjemenom može pristupiti ili potrošiti vaš BCB.","Background Behaviour":"Ponašanje u pozadini","Change 4-digit PIN":"Promijenite 4-znamenkasti PIN","Change Lock Settings":"Promijeni postavke zaključavanja","Fingerprint":"Otisak prsta","Go back to onboarding.":"Vratite se na onboarding.","Hard Lock":"Hard Lock","Hard Timeout":"Hard Timeout","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Ako je omogućeno, Dokaz o radu delegiran je na strani kanala Canoe. Ova je opcija onemogućena i uvijek je na mobilnom Canoeu za sada.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Ako je omogućeno, na kartici Početna pojavit će se popis najnovijih transakcija na svim novčanicima. Trenutno lažna, nije u potpunosti implementirana.","Lock when going to background":"Zaključajte kad idete na pozadinu","None":"nijedan","Password":"Lozinka","Saved":"Spremljeno","Soft Lock":"Soft Lock","Soft Lock Type":"Vrsta mekog zaključavanja","Soft Timeout":"Soft Timeout","Timeout in seconds":"Vremensko ograničenje u sekundama","Unrecognized data":"Neprepoznati podaci","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class = \"toggle-label\" translate = \"\"> Hard Lock </ h5>\n          Uz Hard Lock, kanu šifrira vaš novčanik i potpuno ga uklanja iz memorije. Ne možete onemogućiti Hard Lock, ali možete postaviti vrlo visoku timeout.","A new version of this app is available. Please update to the latest version.":"Dostupna je nova verzija ove aplikacije. Ažurirajte na najnoviju verziju.","Backend URL":"URL pozadine","Change Backend":"Promijeni pozadinu","Change Backend Server":"Promjena poslužitelja backend poslužitelja","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Uvoz novčanika uklonit će vaš postojeći novčanik i račune! Ako imate sredstva u vašem trenutnom novčaniku, provjerite imate li sigurnosnu kopiju za vraćanje iz. Upišite \"delete\" kako biste potvrdili da želite izbrisati trenutni novčanik.","Max":"maksimum","delete":"izbrisati","bitcoin.black":"bitcoin.black","Confirm Password":"Potvrdi lozinku","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Vraćanje na onboarding uklonit će vaš postojeći novčanik i račune! Ako imate sredstva u vašem trenutnom novčaniku, provjerite imate li sigurnosnu kopiju za vraćanje iz. Upišite \"delete\" kako biste potvrdili da želite izbrisati trenutni novčanik.","Please enter a password of at least 8 characters":"Unesite zaporku od najmanje 8 znakova"});
    gettextCatalog.setStrings('hu', {"A member of the team will review your feedback as soon as possible.":"A csapat egyik tagja a lehető leghamarabb megvizsgálja a visszajelzésedet.","Account Information":"Számla információ","Account Name":"Számla név","Account Settings":"Számla beállítások","Account name":"Számla név","Accounts":"Számlák","Add Contact":"Kapcsolat hozzáadása","Add account":"Számla hozzáadása","Add as a contact":"Hozzáadás kapcsolatként","Add description":"Leírás hozzáadása","Address Book":"Címjegyzék","Advanced":"További","Advanced Settings":"További beállítások","Allow Camera Access":"Kamera hozzáférés engedélyezése","Allow notifications":"Értesítések engedélyezése","Almost done! Let's review.":"Majdnem kész! Tekintsük át.","Alternative Currency":"Alternatív valuta","Amount":"Összeg","Are you being watched?":"Figyelnek téged?","Are you sure you want to delete this contact?":"Biztosan törölni akarod ezt a kapcsolatot","Are you sure you want to delete this wallet?":"Biztos vagy benne, hogy törölni akarod ezt a tárcát","Are you sure you want to skip it?":"Biztosan át akarod ugorni?","Backup Needed":"Biztonsági mentés szükséges","Backup now":"Biztonsági mentés most","Backup wallet":"Tárca biztonsági mentése","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Ügyelj arra, hogy a privát kulcsot biztonságos helyen tárold. Ha ez az alkalmazás törlődik vagy ezt az eszközöd ellopják, a privát kulcs az egyetlen módja annak, hogy újra létrehozd a tárcát.","Browser unsupported":"Böngésző nem támogatott","But do not lose your seed!":"De ne veszítsd el a privát kulcsodat!","Buy &amp; Sell Bitcoin":"Bitcoin vétel és eladás","Cancel":"Mégse","Cannot Create Wallet":"Tárca létrehozása nem lehetséges","Choose a backup file from your computer":"Biztonsági mentés fájl választása a számítógépről","Click to send":"Kattints a küldéshez","Close":"Bezárás","Coin":"Érme","Color":"Szín","Confirm":"Megerősítés","Confirm &amp; Finish":"Megerősítés és befejezés","Contacts":"Névjegyzék","Continue":"Folytatás","Contribute Translations":"Közreműködés a fordításokhoz","Copied to clipboard":"Vágólapra másolva","Copy this text as it is to a safe place (notepad or email)":"A szöveg másolása egy biztonságos helyre (jegyzettömb vagy email)","Copy to clipboard":"Másolás a vágólapra","Could not access the wallet at the server. Please check:":"A tárca nem elérhető a szerveren. Ellenőrizd a következőt:","Create Account":"Számla létrehozása","Create new account":"Új számla létrehozása","Creating Wallet...":"Tárca létrehozása...","Creating account...":"Számla létrehozása...","Creating transaction":"Tranzakció létrehozása","Date":"Dátum","Default Account":"Alapértelmezett számla","Delete":"Törlés","Delete Account":"Számla törlése","Delete Wallet":"Tárca törlése","Deleting Wallet...":"Tárca törlése...","Do it later":"Későbbi végrehajtás","Donate to Bitcoin Black":"Adományozás a Canoenak","Download":"Letöltés","Edit":"Szerkesztés","Email":"Email","Email Address":"Email cím","Enable camera access in your device settings to get started.":"Engedélyezd a kamera hozzáférést az eszközöd beállításaiban a kezdéshez.","Enable email notifications":"Email értesítések engedélyezése","Enable push notifications":"Push értesítések engedélyezése","Enable the camera to get started.":"Kamera engedélyezése a kezdéshez","Enter amount":"Add meg az összeget","Enter wallet seed":"Tárca privát kulcsának megadása","Enter your password":"Add meg a jelszót","Error":"Hiba","Error at confirm":"Hiba a megerősítésnél","Export wallet":"Tárca exportálása","Extracting Wallet information...":"Tárca információ kicsomagolása...","Failed to export":"Hiba exportálás közben","Family vacation funds":"Családi vakáció keret","Feedback could not be submitted. Please try again later.":"A visszajelzést nem tudtuk elküldeni. Kérjük próbáld újra.","File/Text":"Fájl/Szöveg","Filter setting":"Beállítások szűrése","Finger Scan Failed":"Ujjlenyomat leolvasás sikertelen","Finish":"Befejezés","From":"Küldő","Funds found:":"Talált összeg:","Funds transferred":"Összeg elküldve","Funds will be transferred to":"Az összeg küldése neki","Get started":{"button":"Kezdés"},"Get started by adding your first one.":"Kezdjük az első hozzáadásával","Go Back":"Vissza","Go back":"Vissza","Got it":"Rendben","Help & Support":"Segítség és támogatás","Help and support information is available at the website.":"Segítség és támogatás ezen az weboldalon érhető el.","Hide Balance":"Egyenleg elrejtése","Home":"Kezdőoldal","How could we improve your experience?":"Hogyan javíthatnánk az élményedet?","I don't like it":"Nem tetszik","I have read, understood, and agree with the Terms of use.":"Elolvastam, megértettem és elfogadom a Használati feltételeket.","I like the app":"Tetszik az app","I think this app is terrible.":"Szerintem ez az app szörnyű","I understand":"Megértettem","I understand that my funds are held securely on this device, not by a company.":"Megértettem, hogy a pénzemet ez az eszköz tárolja biztonságosan, nem egy cég.","I've written it down":"Leírtam","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Ha ezt a készüléket lecseréled vagy ezt az appot törlöd, a pénzedhez nem férhetsz majd hozzá biztonsági másolat nélkül","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Ha további visszajelzésed van, kérjük tudasd velünk a \"Visszajelzés küldése\" opcióval a Beállítások fülön.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Ha képernyőmentést készítész, a biztonsági mentésedet más appok is láthatják. Biztonságosan készíthetsz másolatot papírral és tollal.","Import Wallet":"Tárca importálása","Import seed":"Privát kulcs importálása","Import wallet":"Tárca importálása","Importing Wallet...":"Tárca importálása...","In order to verify your wallet backup, please type your password.":"A tárca biztonsági mentésének ellenőrzéséhez írd be a jelszavad.","Incomplete":"Hiányos","Insufficient funds":"Elégtelen egyenleg","Invalid":"Helytelen","Is there anything we could do better?":"Ván bármi amin javíthatnánk?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Fontos, hogy a tárca privát kulcsát helyesen írd le. A valami történik a tárcáddal, szükség lesz erre a kulcsra, hogy újra létrehozd azt. Nézd át a privát kulcsot, és próbáld újra.","Language":"Nyelv","Learn more":"Tudj meg többet","Loading transaction info...":"Tranzakció információ betöltése...","Log options":"Naplózási beállítások","Makes sense":"Van értelme","Matches:":"Találatok:","Meh - it's alright":"Eh - rendben van","Memo":"Emlékeztető","More Options":"További beállítások","Name":"Név","New account":"Új számla","No Account available":"Nincs elérhető számla","No contacts yet":"Még nincsenek kapcsolatok","No entries for this log level":"Nincsenek bejegyzések ehhez a naplózási szinthez","No recent transactions":"Nincsenek friss tranzakciók","No transactions yet":"Még nincs tranzakció","No wallet found":"Nincs tárca","No wallet selected":"Nincs tárca kiválasztva","No wallets available to receive funds":"Nincs elérhető tárca összeg fogadására","Not now":"Most nem","Note":"Megjegyzés","Notifications":"Értesítések","Notify me when transactions are confirmed":"Értesíts ha egy tranzakció megerősítésre került","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Ez egy megfelelő alkalom, hogy biztonsági mentést készíts a tárcádról. Ha ezt az eszközt elveszíted, a biztonsági mentés nélkül lehetetlen lesz hozzáférni a pénzedhez.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Ez egy jó alkalom arra, hogy felmérd a környezeted. Közeli ablakok? Rejtett kamerák? Mögötted kémkedők?","Numbers and letters like 904A2CE76...":"Számok és betűk mint 904A2CE76...","OK":"OK","OKAY":"Rendben","Official English Disclaimer":"Hivatalos angol felelősségi nyilatkozat","Oh no!":"Jaj ne!","Open":"Megnyitás","Open GitHub":"GitHub megnyitása","Open GitHub Project":"GitHub projekt megnyitása","Open Settings":"Beállítások megnyitása","Open Website":"Weboldal megnyitása","Open website":"Weboldal megnyitása","Paste the backup plain text":"Másold be a biztonsági mentést szövegként","Payment Accepted":"Fizetés elfogadva","Payment Proposal Created":"Fizetési kérelem létrehozva","Payment Received":"Fizetés fogadva","Payment Rejected":"Fizetés elutasítva","Payment Sent":"Fizetés elküldve","Permanently delete this wallet.":"A pénztárca végleges törlése.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Óvatosan írd le ezt a 64 karakterből álló privát kulcsot. Kattints a vágólapra másoláshoz.","Please connect a camera to get started.":"Csatlakozz a kamerához a kezdéshez.","Please enter the seed":"Add meg a privát kulcsot","Please, select your backup file":"Válaszd ki a biztonsági mentés fájlt","Preferences":"Preferenciák","Preparing addresses...":"Számlák előkészítése","Preparing backup...":"Biztonsági mentés előkészítése...","Press again to exit":"Nyomd meg újra a kilépéshez","Private Key":"Privát kulcs","Private key encrypted. Enter password":"Privát kulcs titkosítva. Add meg a jelszót","Push Notifications":"Push értesítések","QR Code":"QR kód","Rate on the app store":"Értékelés az app store-ban","Receive":"Fogadás","Received":"Fogadva","Recent":"Friss","Recent Transactions":"Friss tranzakciók","Recipient":"Fogadó","Release information":"Verzió információ","Remove":"Eltávolítás","Restore from backup":"Biztonsági mentés visszaállítása","Retry":"Újra próbálás","Retry Camera":"Kamera újra próbálása","Save":"Mentés","Scan":"Beolvasás","Scan QR Codes":"QR kódok beolvasása","Scan again":"Újraolvasás","Scan your fingerprint please":"Olvasd be az ujjlenyomatodat","Screenshots are not secure":"A képernyőmentések nem biztonságosak","Search Transactions":"Tranzakciók keresése","Search or enter account number":"Számla címének keresése vagy bevitele","Search transactions":"Tranzakciók keresése","Search your currency":"A valutád keresése","Select a backup file":"Biztonsági mentés fájl kiválasztása","Select an account":"Válassz számlát","Send":"Küldés","Send Feedback":"Visszajelzés küldése","Send by email":"Küldés emaillel","Send from":"Küldés innen","Send max amount":"Maximum összeg küldése","Send us feedback instead":"Küldj inkább visszajelzést nekünk","Sending":"Küldés","Sending feedback...":"Visszajelzés küldése...","Sending maximum amount":"Maximum érték küldése folyamatban","Sending transaction":"Tranzakció küldése","Sending {{amountStr}} from your {{name}} account":"{{amountStr}} küldése {{name}} számládról folyamatban","Sent":"Elküldve","Services":"Szolgáltatások","Session Log":"Munkamenet naplója","Session log":"Munkamenet naplója","Settings":"Beállítások","Share the love by inviting your friends.":"Oszd meg a szeretetet a barátaid meghívásával","Show Account":"Számla mutatása","Show more":"Több mutatása","Signing transaction":"Tranzakció aláírása","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Mivel csak neked van hozzáférésed a pénzedhez, szükséges lesz elmentened a tárca privát kulcsát arra az esetre, ha ez az app törlődne.","Skip":"Átugrás","Slide to send":"Csúsztass a küldéshez","Sweep paper wallet":"Papír tárca olvasása","Sweeping Wallet...":"Tárca olvasása...","THIS ACTION CANNOT BE REVERSED":"EZ A MŰVELET NEM VISSZAFORDÍTHATÓ","Tap and hold to show":"Érints és tartsd lenyomva a mutatáshoz","Terms Of Use":"Használati feltételek","Terms of Use":"Használati feltételek","Text":"Szöveg","Thank you!":"Köszönjük!","Thanks!":"Köszönjük!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Ezt izgalmas hallani. Szeretnénk tőled kiérdemelni az ötödik csillagot – hogyan tudnánk javítani az élményedet?","The seed":"A privát kulcs","The seed is invalid, it should be 64 characters of: 0-9, A-F":"A privát kulcs helytelen, a következő 64 karakterből kell állnia: 0-9, A-F","The wallet server URL":"A tárca szerver URL-je","There is an error in the form":"Hiba az űrlapon","There's obviously something we're doing wrong.":"Nyilvánvalóan valamit rosszul csinálunk.","This app is fantastic!":"Ez az app fantasztikus!","Timeline":"Idővonal","To":"Neki","Touch ID Failed":"Touch ID sikertelen","Transaction":"Tranzakció","Transfer to":"Átutalás neki","Transfer to Account":"Számlára utalás","Try again in {{expires}}":"Próbáld újra {{expires}} múlva","Uh oh...":"Uh oh...","Update Available":"Frissítés elérhető","Updating... Please stand by":"Frissítés folyamatban... Kérjük várj","Verify your identity":"Igazold az identitásodat","Version":"Verzió","View":"Megtekintés","View Terms of Service":"Szolgáltatási feltételek megtekintése","View Update":"Frissítés megtekintése","Wallet Accounts":"A tárca számlái","Wallet File":"Tárca fájl","Wallet Seed":"Tárca privát kulcsa","Wallet seed not available":"A tárca privát kulcsa nem elérhető","Warning!":"Vigyázat!","Watch out!":"Vigyázz!","We'd love to do better.":"Szeretnénk jobban teljesíteni.","Website":"Weboldal","What do you call this account?":"Hogyan nevezed ezt a számlát?","Would you like to receive push notifications about payments?":"Szeretnél push értesítéseket kapni a fizetésekről?","Yes":"Igen","Yes, skip":"Igen, átugrás","You can change the name displayed on this device below.":"Alább megváltoztathatod ezen az eszközön mutatott nevet.","You can create a backup later from your wallet settings.":"Később létrehozhatsz egy biztonsági mentést a tárcád beállításainál.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Láthatod a legutóbbi fejlesztéseket és hozzájárulhatsz ehhez a nyílt forráskódú apphoz ha meglátogatod a projektünket a GitHub-on.","You can still export it from Advanced &gt; Export.":"Továbbra is tudod exportálni a További &gt; Exportálás segítségével.","You'll receive email notifications about payments sent and received from your wallets.":"Email értesítéseket fogsz kapni a tárcához kapcsolódó ki- és befizetésekről.","Your ideas, feedback, or comments":"Ötleteid, visszajelzéseid vagy hozzászólásaid.","Your password":"A jelszavad","Your wallet is never saved to cloud storage or standard device backups.":"A tárcád soha nem kerül mentésre a felhőben vagy az eszköz biztonsági mentésekor.","[Balance Hidden]":"[Egyenleg rejtve]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Elolvastam, megértettem és elfogadom a <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Felhasználási feltételeket</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Az 5 csillagos értékelések segítenek a Canoe-t eljuttatni minél több emberhez, több felhasználó több erőforrást jelent, amit az app fejlesztésére tudunk fordítani!","At least 8 Characters. Make it good!":"Legalább 8 karakter. Találj ki jót!","Change Password":"Jelszó megváltoztatása","Confirm New Password":"Új jelszó megerősítése","How do you like Canoe?":"Mennyire tetszik a Canoe?","Let's Start":"Vágjunk bele","New Password":"Új jelszó","Old Password":"Régi jelszó","One more time.":"Még egyszer.","Password too short":"Jelszó túl rövid","Passwords don't match":"A jelszavak nem egyeznek","Passwords match":"A jelszavak egyeznek","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"A push értesítések a Canoe-hoz jelenleg le vannak tiltva. Engedélyezd őket a Beállítások appban","Share Canoe":"Canoe megosztása","There is a new version of Canoe available":"A Canoe egy új verziója érhető el","We're always looking for ways to improve Canoe.":"Mindig keresünk új módokat, amikkel fejleszthetjük a Canoe-t.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Mindig keresünk új módokat, amikkel fejleszthetjük a Canoe-t. Hogyan tudnánk javítani az élményedet?","Would you be willing to rate Canoe in the app store?":"Szeretnéd értékelni a Canoe-t az app store-ban","Account Alias":"Számla alternatív neve","Account Color":"Számla színe","Alias":"Alternatív név","Backup seed":"Biztonsági mentés privát kulcs","Create Wallet":"Tárca létrehozása","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Nem látod a nyelvedet? Regisztrálj a POEditor-ra! Szeretnénk a te nyelvedet is támogatni.","Edit Contact":"Kapcsolat szerkesztése","Enter password":"Add meg a jelszót","Incorrect password, try again.":"Helytelen jelszó, próbáld újra.","Joe Doe":"Kovács János","Join the future of money,<br>get started with BCB.":"Csatlakozz a pénz jövőjéhez,<br>láss hozzá Nanoval.","Lock wallet":"Canoe zárolása","BCB is different – it cannot be safely held with a bank or web service.":"BCB más &ndash; nem lehet biztonságosan tárolni egy banknál vagy webszolgáltatásnál.","No accounts available":"Nincs elérhető számla","No backup, no BCB.":"Nincs biztonsági mentés, nincs BCB.","Open POEditor":"POEditor megnyitása","Open Translation Site":"Fordító oldal megnyitása","Password to decrypt":"Jelszó dekódolása","Password to encrypt":"Jelszó titkosítása","Please enter a password to use for the wallet":"Add meg a jelszót a tárca használatához","Repair":"Javítás","Send BCB":"BCB küldése","Start sending BCB":"Kezd Nanot használni","To get started, you need BCB. Share your account to receive BCB.":"Kezdésnek Nanora lesz szükséged. Oszd meg a számlád, hogy Nanot fogadhass.","To get started, you need an Account in your wallet to receive BCB.":"Kezdéshez szükség lesz egy számlára a tárcádban, hogy BCB-t tudj fogadni.","Type below to see if an alias is free to use.":"Írj alább, hogy lásd az alternatív név elérhető-e.","Use Server Side PoW":"Szerver oldali PoW használata","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Folyamatosan keresünk hozzájárulásokat a fordításhoz! Végezhetsz javításokat vagy segíthetsz, hogy ez az app elérhető legyen az anyanyelveden ha csatlakozol a közösségünkhöz a POEditor-on.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Közreműködhetsz azzal, hogy regisztrálsz a POEditor közösségi fordító projekthez. Várjuk, mihamarabbi hozzájárulásodat!","You can scan BCB addresses, payment requests and more.":"Beolvashatsz BCB számlákat, fizetési kérelmeket és egyebeket.","Your Bitcoin Black Betanet Wallet is ready!":"A BCB tárcád készen áll!","Your BCB wallet seed is backed up!":"A BCB tárcád titkos kulcsa mentésre került!","Account":"Számla","An account already exists with that name":"Egy számla már létezik ezzel a névvel","Confirm your PIN":"Erősítsd meg a PIN-edet","Enter a descriptive name":"Adj meg egy jól leíró nevet","Failed to generate seed QR code":"Nem sikerült privát kulcs QR kódot generálni","Incorrect PIN, try again.":"Helytelen PIN, próbáld újra.","Incorrect code format for a seed:":"Helytelen kód formátum egy privát kulcshoz:","Information":"Információ","Not a seed QR code:":"Nem egy privát kulcs QR kód:","Please enter your PIN":"Add meg a PIN-edet","Scan this QR code to import seed into another application":"Olvasd be ezt a QR kódot, hogy beimportáld a privát kulcsot egy másik applikációba","Security Preferences":"Biztonsági preferenciák","Your current password":"A jelenlegi jelszavad","Your password has been changed":"A jelszavad módosult","Canoe stores your BCB using cutting-edge security.":"Canoe korszerű biztonsági technológiával tárolja a Nanodat.","Caution":"Vigyázat","Decrypting wallet...":"A tárca feloldása...","Error after loading wallet:":"Hiba a tárca betöltése után:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Megértettem, hogyha ez az app törlődik, a tárcámat csak a privát kulccsal vagy a tárca fájl biztonsági mentésével lehet helyreállítani.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Egy tárca importálása törli a jelenlegi tárcát és annak számláit. Érdemes lehet előbb biztonsági mentést készíteni a jelenlegi privát kulcsodról vagy egy fájlként elmenteni a tárca adatait.","Incorrect code format for an account:":"Helytelen kód formátum egy számlához","Just scan and pay.":"Csak olvasd be és fizess.","Manage":"Kezelés","BCB is Feeless":"BCB díjmentes","BCB is Instant":"BCB azonnali","BCB is Secure":"BCB biztonságos","Never pay transfer fees again!":"Ne fizess többé átutalási díjakat!","Support":"Támogatás","Trade BCB for other currencies like USD or Euros.":"Cserélj Nanot más valutákra mint például USD vagy Euro.","Transfer BCB instantly to anyone, anywhere.":"Utalj Nanot azonnal bárkinek, bárhol.","Account Representative":"Számla megbízott","Add to address book?":"Hozzáadás a címjegyzékhez?","Alias Found!":"Alternatív név megtalálva!","At least 3 Characters.":"Legalább 3 karakter.","Checking availablity":"Elérhetőség ellenőrzése folyamatban","Create Alias":"Alternatív név létrehozása","Creating Alias...":"Alternatív név létrehozása...","Do you want to add this new address to your address book?":"Hozzá akarod adni ezt az új számlát a címjegyzékhez?","Edit your alias.":"Alternatív név szerkesztése.","Editing Alias...":"Alternatív név szerkesztése...","Email for recovering your alias":"Email az alternatív név visszaszerzéséhez","Enter a representative account.":"Add meg a megbízott számlát","Error importing wallet:":"Hiba tárca importálásakor:","How to buy BCB":"Hogyan lehet Nanot venni","How to buy and sell BCB is described at the website.":"BCB vásárlásának és eladásának módját a weboldal részletezi.","Invalid Alias!":"Érvénytelen alternatív név!","Invalid Email!":"Helytelen email!","Let People Easily Find you With Aliases":"Segíts másoknak, hogy könnyebbel megtaláljanak alternatív nevek segítségével","Link my wallet to my phone number.":"A tárcám hozzárendelése a telefonszámomhoz.","Looking up @{{addressbookEntry.alias}}":"@{{addressbookEntry.alias}} keresése","Make my alias private.":"Legyen az alternatív nevem privát.","Refund":"Visszatérítés","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"A tárcád helyreállítása eltarthat egy ideig. Ez újratölt minden a tárcához tartozó blokkláncot. Biztosan szeretnéd a helyreállítást?","Representative":"Megbízott","Representative changed":"Megbízott megváltoztatva","That alias is taken!":"Ez az alternatív név már foglalt!","The official English Terms of Service are available on the Canoe website.":"A hivatalos angol szolgáltatási feltételek elérhetők a Canoe weboldalon.","Valid Alias & Email":"Érvényes alternatív név és email","View Block on BCB Block Explorer":"Blokk megtekintése BCB Block Explorer-on","View on BCB Block Explorer":"Megtekintés BCB Block Explorer-on","What alias would you like to reserve?":"Milyen alternatív nevet szeretnél lefoglalni","You can change your alias, email, or privacy settings.":"Az alternatív neved, email címed és az adatvédelmi beállításokat megváltoztathatod.","Your old password was not entered correctly":"A régi jelszavadat rosszul adtad meg","joe.doe@example.com":"kovacs.janos@minta.com","joedoe":"kovacsjanos","Wallet is Locked":"Canoe zárolva van","Forgot Password?":"Elfelejtetted a jelszavad?","4-digit PIN":"4 számjegyű PIN","Anyone with your seed can access or spend your BCB.":"A privát kulcsod birtokában bárki hozzá tud férni a Nanodhoz vagy el tudja azt költeni","Background Behaviour":"Háttér működés","Change 4-digit PIN":"4 számjegyű PIN megváltoztatása","Change Lock Settings":"Zár beállítások megváltoztatása","Fingerprint":"Ujjlenyomat","Go back to onboarding.":"Vissza a bevezetéshez.","Hard Lock":"Szigorú zár","Hard Timeout":"Szigorú időtúllépés","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Ha engedélyezve, a munkabizonyíték (Proof of Work) a Canoe szerver oldal feladata lesz. Ez az opció egyelőre le van tiltva és mindig igaz mobil Canoe esetében.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Ha engedélyezve, az összes tárca friss tranzakcióinak listája fog megjelenni a kezdőoldalon. Jelenleg nem engedélyezett, a funkcionalitás nem befejezett.","Lock when going to background":"Zárolás háttérbe kerüléskor","None":"Egyik sem","Password":"Jelszó","Saved":"Mentve","Soft Lock":"Engedékeny zár","Soft Lock Type":"Engedékeny zár típus","Soft Timeout":"Engedékeny időtúllépés","Timeout in seconds":"Időtúllépés másodpercekben","Unrecognized data":"Ismeretlen adat","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Szigorú zár</h5>\n          Szigorú zárral a Canoe titkosítja a tárcádat és teljesen eltávolítja a memóriából. Nem tudod kikapcsolni a szigorú zárat, de be tudsz állítani egy nagyon hosszú időtúllépést.","A new version of this app is available. Please update to the latest version.":"Az appnak egy új verziója érhető el. Frissíts a legújabb verzióra.","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Tárca importálása eltávolítja a meglévő tárcádat és számláid! Ha van pénzed a jelenlegi tárcádban, bizonyosodj meg arról, hogy van biztonsági mentésed. Írd be a \"törlés\" szót, hogy megerősítsd a jelenlegi tárcád törlését.","Max":"Max","delete":"törlés","bitcoin.black":"bitcoin.black","Confirm Password":"Jelszó megerősítése","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Ha visszatérsz a bevezetéshez, elveszíted a létező tárcádat és számláidat! Ha van pénzed a jelenlegi tárcádban, győződj meg róla, hogy van róla biztonsági mentésed. Írd be a \"törlés\" szót, hogy megerősítsd a a jelenlegi tárca törlését.","Please enter a password of at least 8 characters":"Adj meg egy legalább 8 karakterből álló jelszót","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"Ezen a képernyőn láthatod az összes számládat. Nézd meg a <a ng-click=\"openExternalLinkHelp()\">GYIK-et</a>  mielőtt belekezdesz!","Play Sounds":"Hangok lejátszása","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">Háttér működés</h5>\n            <p translate=\"\">Válaszd ki a zár típust arra az esetre mikor a Canoe háttérbe kerül. A háttér zár kikapcsolásához válaszd az Egyik sem opciót.</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":"<h5 class=\"toggle-label\" translate=\"\">Engedékeny zár</h5>\n          <p translate=\"\">Engedékeny zárral a Canoe zárolásra kerül, de a tárcád továbbra is titkosítatlanul él a memóriában. Engedékeny zár engedélyezésével lehetővé vállnak egyszerűbb azonosítási módok mint például PIN vagy ujjlenyomat.</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Válaszd ki a zár típust arra az esetre mikor a Canoe háttérbe kerül. A háttér zár kikapcsolásához válaszd az Egyik sem opciót.","Encryption Time!":"Titkosítás idő!","Enter at least 8 characters to encrypt your wallet.":"Adj meg legalább 8 karaktert a tárca titkosításához.","Password length ok":"Jelszó hossza rendben","Passwords do not match":"A jelszavak nem egyeznek","Unlock":"Feloldás","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Engedékeny zárral a Canoe zárolásra kerül, de a tárcád továbbra is titkosítatlanul él a memóriában. Engedékeny zár engedélyezésével lehetővé vállnak egyszerűbb azonosítási módok mint például PIN vagy ujjlenyomat.","Attributions":"Tulajdonságok","Block was scanned and sent successfully":"A blokk sikeresen beolvasva és elküldve","Block was scanned but failed to process:":"A blokk beolvasása sikerült de a feldolgozás közben hiba történt:","BCB Account":"BCB számla","Send BCB to this address":"BCB küldése erre a számlára"});
    gettextCatalog.setStrings('it', {"A member of the team will review your feedback as soon as possible.":"Un membro del team esaminerà il tuo feedback appena possibile.","About":"Informazioni","Account Information":"Informazioni account","Account Name":"Nome account","Account Settings":"Impostazioni account","Account name":"Nome account","Accounts":"Account","Add Contact":"Aggiungi contatto","Add account":"Aggiungere account","Add as a contact":"Aggiungi come contatto","Add description":"Aggiungi descrizione","Address Book":"Rubrica indirizzi","Advanced":"Avanzato","Advanced Settings":"Impostazioni avanzate","Allow Camera Access":"Abilita accesso macchina fotografica","Allow notifications":"Consenti notifiche","Almost done! Let's review.":"Quasi finito! Controlliamo.","Alternative Currency":"Valuta alternativa","Amount":"Ammontare","Are you being watched?":"Qualcuno ti sta guardando?","Are you sure you want to delete this contact?":"Sei sicuro di voler cancellare questo contatto?","Are you sure you want to delete this wallet?":"Sei sicuro di voler eliminare questo portafoglio?","Are you sure you want to skip it?":"Sei sicuro di voler saltare questo passaggio?","Backup Needed":"Un backup è necessario","Backup now":"Esegui ora il backup","Backup wallet":"Backup portafoglio","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Assicurati di conservare il seme in un posto sicuro. Se questa applicazione viene rimossa o il tuo dispositivo rubato il seme è l'unico modo per ricreare il portafoglio.","Browser unsupported":"Browser non supportato","But do not lose your seed!":"Ma non perdere mai il tuo seed!","Buy &amp; Sell Bitcoin":"Comprare &amp; Vendere Bitcoin","Cancel":"Annulla","Cannot Create Wallet":"Impossibile creare portafoglio","Choose a backup file from your computer":"Seleziona un file di backup dal tuo computer","Click to send":"Clicca per inviare","Close":"Chiudi","Color":"Colore","Confirm":"Conferma","Confirm &amp; Finish":"Conferma &amp; concludi","Contacts":"Contatti","Continue":"Continua","Contribute Translations":"Contribuisci alle traduzioni","Copied to clipboard":"Copiato negli appunti","Copy this text as it is to a safe place (notepad or email)":"Copia questo testo cosí com'è in un posto sicuro (blocco note o email)","Copy to clipboard":"Copia negli appunti","Could not access the wallet at the server. Please check:":"Non posso accedere al portafoglio sul server. Si prega di controllare:","Create Account":"Crea account","Create new account":"Crea un nuovo account","Creating Wallet...":"Creazione portafoglio...","Creating account...":"Creazione account...","Creating transaction":"Creazione transazione","Date":"Data","Default Account":"Account predefinito","Delete":"Elimina","Delete Account":"Rimuovi account","Delete Wallet":"Elimina wallet","Deleting Wallet...":"Eliminazione del wallet...","Do it later":"Fallo dopo","Donate to Bitcoin Black":"Donazione a Canoe","Download":"Esporta","Edit":"Modifica","Email":"Email","Email Address":"Indirizzo Email","Enable camera access in your device settings to get started.":"Per iniziare abilita l'accesso alla fotocamera dalle impostazioni del tuo dispositivo","Enable email notifications":"Attiva notifiche per email","Enable push notifications":"Abilitare le notifiche push","Enable the camera to get started.":"Abilita la fotocamera per iniziare.","Enter amount":"Inserisci importo","Enter wallet seed":"Inserisci seme del portafoglio","Enter your password":"Inserisci la tua password","Error":"Errore","Error at confirm":"Errore di conferma","Error scanning funds:":"Errore di scansione dei fondi:","Export wallet":"Esporta il portafoglio","Extracting Wallet information...":"Recupero informazioni del portafoglio...","Failed to export":"Esportazione non riuscita","Family vacation funds":"Fondi vacanza di famiglia","Feedback could not be submitted. Please try again later.":"Il feedback non può essere inviato. Riprova più tardi.","File/Text":"File/Testo","Filter setting":"Impostazione del filtro","Finger Scan Failed":"Scansione impronta fallita","From":"Da","Funds transferred":"Fondi trasferiti","Funds will be transferred to":"I fondi saranno trasferiti a","Get started":{"button":"Inizia"},"Get started by adding your first one.":"Inizia aggiungendo il tuo primo.","Go Back":"Torna indietro","Go back":"Torna indietro","Got it":"Ok","Help & Support":"Aiuto e assistenza","Help and support information is available at the website.":"Guida e informazioni di supporto tecnico sono disponibili sul sito web.","Hide Balance":"Nascondi il saldo","Home":"Home","How could we improve your experience?":"Come potremmo migliorare la tua esperienza?","I don't like it":"Non mi piace","I have read, understood, and agree with the Terms of use.":"Ho letto, compreso, e sono d'accordo con le Condizioni d'uso.","I like the app":"Mi piace questa app","I think this app is terrible.":"Penso che questa app sia terribile.","I understand":"Ho capito","I understand that my funds are held securely on this device, not by a company.":"Ho capito che i miei fondi sono custoditi in sicurezza in questo dispositivo, non da un'azienda.","I've written it down":"L'ho scritto","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Se questo dispositivo viene sostituito o questa app viene cancellata, i tuoi fondi non possono essere recuperati senza un backup.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Se si dispone di ulteriori feedback, fatecelo sapere toccando l'opzione \"Invia feedback\" nella scheda Impostazioni.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Se esegui uno screenshot, il backup può essere visualizzato da altre applicazioni. Si può fare un backup sicuro con la carta fisica e una penna.","Import Wallet":"Importa portafoglio","Import seed":"Importa seme","Import wallet":"Importa portafoglio","Importing Wallet...":"Importazione del portafoglio...","In order to verify your wallet backup, please type your password.":"Per verificare il backup del tuo portafoglio, inserire la password.","Incomplete":"Incompleto","Insufficient funds":"Fondi insufficienti","Invalid":"Invalido","Is there anything we could do better?":"C'è qualcosa che potevamo fare meglio?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"E' molto importante che copi il seme del portafoglio correttamente. Se dovesse succedere qualcosa al tuo portafoglio ne avrai bisogno per ricrearlo. Ricontrolla il seme e riprova.","Language":"Lingua","Learn more":"Ulteriori informazioni","Loading transaction info...":"Caricamento dettagli della transazione...","Log options":"Opzioni di log","Makes sense":"Ho capito","Matches:":"Corrispondenze:","Meh - it's alright":"Beh - è tutto ok","Memo":"Nota","More Options":"Altre Opzioni","Name":"Nome","New account":"Nuovo account","No Account available":"Nessun account disponibile","No contacts yet":"Ancora nessun contatto","No entries for this log level":"Nessuna voce per questo livello di log","No recent transactions":"Nessuna transazione recente","No transactions yet":"Ancora nessuna transazione","No wallet found":"Nessun portafoglio trovato","No wallet selected":"Nessun portafoglio selezionato","No wallets available to receive funds":"Nessun portafoglo disponibile per ricevere i fondi","Not funds found":"Fondi non trovati","Not now":"Non ora","Note":"Nota","Notifications":"Notifiche","Notify me when transactions are confirmed":"Avvisami quando le transazioni sono confermate","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Ora è un buon momento per effettuare un backup del tuo portafoglio. Se questo dispositivo andasse perso, sarebbe impossibile accedere ai tuoi fondi senza una copia di backup.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"È il momento perfetto per valutare l'ambiente circostante. Finestre nelle vicinanze? Telecamere nascoste? Spie alle spalle?","Numbers and letters like 904A2CE76...":"Numeri e caratteri tipo 904A2CE7...","OK":"Ok","OKAY":"VA BENE","Official English Disclaimer":"Dichiarazione di esclusione di responsabilità ufficiale in inglese","Oh no!":"Oh no!","Open":"Apri","Open GitHub":"Aprire Github","Open GitHub Project":"Aprire il progetto GitHub","Open Settings":"Apri Impostazioni","Open Website":"Apri sito","Open website":"Apri il sito","Paste the backup plain text":"Incolla il testo semplice di backup","Payment Accepted":"Pagamento Accettato","Payment Proposal Created":"Proposta di Pagamento Creata","Payment Received":"Pagamento ricevuto","Payment Rejected":"Pagamento Rifiutato","Payment Sent":"Pagamento Inviato","Permanently delete this wallet.":"Eliminare definitivamente questo portafoglio.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Copia scrupolosamente questo seme di 64 caratteri. Clicca per copiarlo negli appunti.","Please connect a camera to get started.":"Si prega di collegare una telecamera per iniziare.","Please enter the seed":"Per favore inserire il seme","Please, select your backup file":"Per favore, selezione il tuo file di backup","Preferences":"Preferenze","Preparing addresses...":"Preparazione indirizzi...","Preparing backup...":"Preparando il backup...","Press again to exit":"Premi ancora per uscire","Private Key":"Chiave Privata","Private key encrypted. Enter password":"Chiave privata cifrata. Inserisci la password","Push Notifications":"Notifiche push","QR Code":"Codice QR","Quick review!":"Breve recensione!","Rate on the app store":"Valuta su App Store","Receive":"Ricevi","Received":"Ricevuto","Recent":"Recente","Recent Transaction Card":"Transazioni recenti","Recent Transactions":"Transazioni recenti","Recipient":"Destinatario","Release information":"Informazioni sul rilascio","Remove":"Rimuovi","Restore from backup":"Ripristina da backup","Retry":"Riprova","Retry Camera":"Riprova con fotocamera","Save":"Salva","Scan":"Scansiona","Scan QR Codes":"Scansiona il codici QR","Scan again":"Ripetere la scansione","Scan your fingerprint please":"Per cortesia procedere alla scansione dell'impronta digitale","Scanning Wallet funds...":"Scansione fondi Portafoglio...","Screenshots are not secure":"Gli screenshot non sono sicuri","Search Transactions":"Cerca Transazioni","Search or enter account number":"Cerca o inserisci indirizzo","Search transactions":"Ricerca transazioni","Search your currency":"Cerca la tua valuta","Select a backup file":"Seleziona un file di backup","Select an account":"Seleziona un account","Send":"Invia","Send Feedback":"Invia Feedback","Send by email":"Invia via email","Send from":"Inviata Da","Send max amount":"Inviare l'importo massimo","Send us feedback instead":"Inviaci invece i tuoi pareri","Sending":"Invio","Sending feedback...":"Invio feedback...","Sending maximum amount":"Invio dell'importo massimo","Sending transaction":"Invio transazione","Sending {{amountStr}} from your {{name}} account":"Invia  {{amountStr}} dall'account \"{{name}}\"","Sent":"Inviato","Services":"Servizi","Session Log":"Registro di sessione","Session log":"Registro sessione","Settings":"Impostazioni","Share the love by inviting your friends.":"Condividi il piacere invitando i tuoi amici.","Show Account":"Mostra account","Show more":"Mostra di più","Signing transaction":"Firmando transazione","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Dato che solo tu controlli i tuoi soldi, dovrai salvare il seme del portafoglio nel caso in cui l'app venga cancellata.","Skip":"Salta","Slide to send":"Trascina per inviare","Sweep":"Spazzola","Sweep paper wallet":"Spazzare il portafoglio di carta","Sweeping Wallet...":"Spazzolamento Portafoglio...","THIS ACTION CANNOT BE REVERSED":"QUESTA AZIONE NON PUÒ ESSERE INVERTITA","Tap and hold to show":"Toccare e tenere premuto per mostrare","Terms Of Use":"Termini di utilizzo","Terms of Use":"Termini di Utilizzo","Text":"Testo","Thank you!":"Grazie!","Thanks!":"Grazie!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Questo è bello da sentire. Ci piacerebbe guadagnare quella quinta stella da te - come potremmo migliorare la tua esperienza?","The seed":"Il seme","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Questo seme non è valido. Deve contenere 64 simboli da 0-9, A-F","The wallet server URL":"\n","There is an error in the form":"C'è un errore nel form","There's obviously something we're doing wrong.":"C'è evidentemente qualcosa che stiamo sbagliando.","This app is fantastic!":"Questa applicazione è fantastica!","Timeline":"Cronologia","To":"A","Touch ID Failed":"Touch ID Fallito","Transaction":"Transazione","Transfer to":"Trasferisci a","Transfer to Account":"Trasferimento ad un  account","Try again in {{expires}}":"Provare di nuovo in {{expires}}","Uh oh...":"Oh oh...","Update Available":"Aggiornamento Disponibile","Updating... Please stand by":"In aggiornamento... Attendere","Verify your identity":"Verifica della tua identità","Version":"Versione","View":"Visualizza","View Terms of Service":"Visualizza i termini di servizio","View Update":"Visualizza aggiornamenti","Wallet Accounts":"Account del portafoglio","Wallet File":"File del portafoglio","Wallet Seed":"Seme del portafoglio","Wallet seed not available":"Seme del portafoglio non disponibile","Warning!":"Attenzione!","Watch out!":"Attenzione!","We'd love to do better.":"Ci piacerebbe fare di più.","Website":"Sito Web","What do you call this account?":"Come vuoi chiamare questo account?","Would you like to receive push notifications about payments?":"Vorresti ricevere le notifiche push sui pagamenti?","Yes":"Sì","Yes, skip":"Sì, saltare","You can change the name displayed on this device below.":"E' possibile modificare il nome mostrato qui sotto.","You can create a backup later from your wallet settings.":"È possibile creare più tardi una copia di backup dalle impostazioni del tuo portafoglio.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Potete vedere gli ultimi sviluppi e contribuire a questa applicazione open source andando al nostro progetto su GitHub.","You can still export it from Advanced &gt; Export.":"È comunque possibile esportare da Avanzate &gt; Esporta.","You'll receive email notifications about payments sent and received from your wallets.":"Riceverai notifiche e-mail per i pagamenti inviati e ricevuti dai tuoi portafogli.","Your ideas, feedback, or comments":"Vostre idee, feedback o commenti","Your password":"La tua password","Your wallet is never saved to cloud storage or standard device backups.":"Il tuo portafoglio non viene mai salvato in archiviazione cloud o nel normale backup del dispositivo.","[Balance Hidden]":"[Fondi nascosti]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Ho letto, capito e accettato  le <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Condizioni d'uso</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Le valutazioni a 5 stelle ci aiutano a rendere disponibile Canoe a più utenti e questo significa che è possibile impegnare più risorse per l'app!","At least 8 Characters. Make it good!":"Minimo 8  caratteri. Scegliere una forte!","Change Password":"Cambia la password","Confirm New Password":"Conferma nuova password","How do you like Canoe?":"Come ti piace Canoe?","Let's Start":"Cominciamo","New Password":"Nuova password","Old Password":"Vecchia password","One more time.":"Un'altra volta","Password too short":"Password troppo corta","Passwords don't match":"Password non coincidono","Passwords match":"Password coincidono","Share Canoe":"Condividi Canoe","There is a new version of Canoe available":"E' disponibile una nuova versione di Canoe","We're always looking for ways to improve Canoe.":"Cerchiamo sempre di trovare modi per migliorare Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Siamo sempre alla ricerca di modi come migliorare Canoe. Come potremmo migliorare la tua esperienza?","Would you be willing to rate Canoe in the app store?":"Saresti disposto a valutare Canoe nell'app store?","Account Alias":"Alias account","Account Color":"Colore account","Alias":"Alias","Backup seed":"Backup seme","Create Wallet":"Crea portafoglio","Don't see your language? Sign up on POEditor! We'd love to support your language.":"La tua lingua non è presente? Crea un account su POEditor! Ci piacerebbe supportare anche tua lingua.","Edit Contact":"Modifica contatto","Enter password":"Inserisci password","Incorrect password, try again.":"Password sbagliata, riprova.","Joe Doe":"Mario Rossi","Join the future of money,<br>get started with BCB.":"Partecipa al futuro del denaro, <br> inizia con BCB!","Lock wallet":"Blocca Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB è diverso &ndash; non può essere tenuto in sicurezza con un servizio web o una banca.","No accounts available":"Nessun account disponibile","No backup, no BCB.":"Nessun backup - nessun BCB","Open POEditor":"Apri POEditor","Open Translation Site":"Apri i sito per le traduzioni","Password to decrypt":"Password per decifrare","Password to encrypt":"Passwort per cifrare","Please enter a password to use for the wallet":"Per favore inserisci una password per aprire il portafoglio","Repair":"Ripara","Send BCB":"Invia BCB","Start sending BCB":"Comincia a usare BCB","To get started, you need BCB. Share your account to receive BCB.":"Per iniziare hai bisogno di BCB. Condividi tuo account per ricevere BCB.","Type below to see if an alias is free to use.":"Digitare qui sotto per verificare se un alias è disponibile.","Use Server Side PoW":"Usa PoW lato server","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Siamo sempre alla ricerca di contributi di traduzione! Puoi apportare correzioni o contribuire a rendere questa app disponibile nella tua lingua madre aderendo alla nostra community su POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Puoi contribuire alle traduzioni iscrivendoti al nostro progetto di traduzioni. Non vediamo l'ora di sentirti!","You can scan BCB addresses, payment requests and more.":"Puoi eseguire la scansione di   indirizzi BCB, richieste di pagamento e altro ancora.","Your Bitcoin Black Betanet Wallet is ready!":"Il portafoglio BCB è pronto!","Your BCB wallet seed is backed up!":"Hai fatto il backup del seme del tuo portafoglio!","Account":"Account","An account already exists with that name":"Nome account già esistente","Confirm your PIN":"Conferma il PIN","Enter a descriptive name":"Inserisci un nome descritivo","Failed to generate seed QR code":"Scansione del codice QR fallita","Incorrect PIN, try again.":"PIN errato, riprova","Incorrect code format for a seed:":"Codice del seme errato","Information":"Informazione","Not a seed QR code:":"Codice QR non è un seme","Please enter your PIN":"Inserire PIN","Scan this QR code to import seed into another application":"Scansiona questo codice QR per importare il seme in un'altra applicazione","Security Preferences":"Preferenze di sicurezza","Your current password":"Password attuale","Your password has been changed":"La tua password è stato aggiornato","Canoe stores your BCB using cutting-edge security.":"Canoe salva i tuoi BCB con sicurezza all'avanguardia.","Caution":"Attenzione","Decrypting wallet...":"Decifrazione portafoglio....","Error after loading wallet:":"Errore dopo caricamento portafoglio:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Ho capito che se questa app viene eliminata, il mio portafoglio può essere ripristinato solo con il seme o il backup di un file portafoglio.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"L'importazione di un portafoglio rimuove il portafoglio esistente e tutti gli account presenti. Puoi fare un backup del seme o del file del portafoglio prima.","Incorrect code format for an account:":"Formato account errato:","Just scan and pay.":"Basta scansionare e pagare.","Manage":"Gestione","BCB is Feeless":"BCB è senza spese","BCB is Instant":"BCB è instantaneo","BCB is Secure":"BCB è sicuro","Never pay transfer fees again!":"Non pagare mai più commissioni!","Support":"Supporto","Trade BCB for other currencies like USD or Euros.":"Scambia BCB per altre valute come USD o Euro.","Transfer BCB instantly to anyone, anywhere.":"Trasferisci BCB istantaneamente a chiunque, ovunque.","Account Representative":"Rappresentante del account","Add to address book?":"Aggiungere alla rubrica?","Alias Found!":"Alias trovato!","At least 3 Characters.":"Minimo 3 caratteri.","Checking availablity":"Controllo disponibilità","Create Alias":"Crea un alias","Creating Alias...":"Creando alias...","Do you want to add this new address to your address book?":"Aggiungere questo indirizzo  nuovo alla rubrica?","Edit your alias.":"Modifica tuo alias.","Editing Alias...":"Modificando alias...","Email for recovering your alias":"Indirizzo email per ripristinare l'alias","Enter a representative account.":"Inserisci un rappresentante per l'account.","Error importing wallet:":"Errore importazione portafoglio:","How to buy BCB":"Come acquistare BCB","How to buy and sell BCB is described at the website.":"Come acquistare e vendere BCB è descritto sul sito web.","Invalid Alias!":"Alias non valido!","Invalid Email!":"Email non valida!","Let People Easily Find you With Aliases":"Consenti alle persone di trovarti facilmente con l'alias","Link my wallet to my phone number.":"Collega il mio portafoglio al mio numero di telefono.","Looking up @{{addressbookEntry.alias}}":"Controllando @{{addressbookEntry.alias}}","Make my alias private.":"Rendi il mio alias privato.","Refund":"Rimborsa","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Restaurare il portafoglio potrebbe durare un po'. Questa funziona  ricarica tutte le blockchain associate al tuo portafoglio. Sei sicuro di avviare la restaurazione?","Representative":"Rappresentante","Representative changed":"Rappresentante cambiato","That alias is taken!":"Questo alias è riservato!","The official English Terms of Service are available on the Canoe website.":"I termini di servizio in inglese ufficiali sono disponibili sul sito Web Canoe.\n","Valid Alias & Email":"Alias & indirizzo mail validi","View Block on BCB Block Explorer":"Vedi blocco su BCB Block Explorer","View on BCB Block Explorer":"Vedi su BCB Block Explorer","What alias would you like to reserve?":"Quale alias vorresti prenotare?","You can change your alias, email, or privacy settings.":"Puoi modificare il tuo alias, indirizzo mail o le impostazioni di privacy.","Your old password was not entered correctly":"La vecchia password inserita non è valida.","joe.doe@example.com":"mario.rossi@mail.it","joedoe":"mariorossi","Wallet is Locked":"Canoe è bloccato","Forgot Password?":"Dimenticata la password?","4-digit PIN":"PIN a 4 cifre","Anyone with your seed can access or spend your BCB.":"Ogni uno in possesso del seme può accedere o spendere i tuoi BCB.","Background Behaviour":"Comportamento secondo piano","Change 4-digit PIN":"Cambia PIN a 4 cifre","Change Lock Settings":"Cambia impostazioni di blocco","Fingerprint":"Impronta digitale","Go back to onboarding.":"Ritorna alla registrazione.","Hard Lock":"Blocco completo","Hard Timeout":"Tempo","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Se abilitato, Proof of Work viene delegato al server Canoa. Questa opzione è disabilitata e sempre attiva su dispositivi mobili per ora.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Se abilitato, un elenco di transazioni recenti su tutti i portafogli apparirà nella scheda Home. Attualmente disabilitato perché non completamente implementato.","Lock when going to background":"Blocca quando va in secondo piano","None":"Nessuno","Password":"Password","Saved":"Salvato","Soft Lock":"Blocco primario","Soft Lock Type":"Tipo di blocco primario","Soft Timeout":"Tempo","Timeout in seconds":"Scadenza in secondi","Unrecognized data":"Data non riconosciuto","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Blocco completo</h5>\n          Il blocco completo crittografa il portafoglio e lo rimuove dalla memoria. Non è possibile disabilitarlo, ma si può scegliere un valore molto alto.","A new version of this app is available. Please update to the latest version.":"È disponibile una nuova versione di questa app. Si prega di aggiornare alla versione più recente.\n","Backend URL":"Indirizzo Server Backend","Change Backend":"Cambia Server","Change Backend Server":"Cambia Backend Server","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Importando un portafoglio rimuove il portafoglio esistente! Se questo contiene fondi assicurati di avere il seme e/o il file di backup. Scrivi \"cancella\" per confermare la cancellazione del portafoglio esistente.","Max":"Max","delete":"cancella","bitcoin.black":"bitcoin.black","Confirm Password":"Conferma password","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"￼Tornando all'inizio rimuoverai il tuo portafoglio e account esistenti! Se disponi di fondi nel tuo portafoglio corrente, assicurati di disporre di un backup da cui ripristinare. Digita \"cancella\" per confermare che desideri eliminare il tuo portafoglio corrente.","Please enter a password of at least 8 characters":"Per favore inserire una password di almeno 8 caratteri","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"Qui puoi vedere tutti i tuoi account. Leggi le  <a ng-click=\"openExternalLinkHelp()\">FAQ</a> prima di cominciare!","Play Sounds":"Attiva notifiche sonore","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">Comportamento se in secondo piano</h5>\n            <p translate=\"\">Seleziona il tipo di blocco quando Canoe va in secondo piano. Seleziona Nessuno per impedire il blocco.</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":" <h5 class=\"toggle-label\" translate=\"\">Blocco primario</h5>\n          <p translate=\"\">Con il blocco primario Canoe è bloccato ma il portafoglio è aperto nella memoria. Abilitare il blocco primario rende possibile l'uso di forme di autenticazione semplici come PIN o impronte digitali.</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Seleziona il tipo di blocco quando Canoe va in secondo piano. Seleziona Nessuno per impedire il blocco.","Encryption Time!":"Il momento della crittografia","Enter at least 8 characters to encrypt your wallet.":"Inserire almeno 8 caratteri per crittografare il portafoglio.","Password length ok":"Lunghezza password sufficiente","Passwords do not match":"Password non coincidono","Unlock":"Sblocca","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Il blocco primario blocca Canoe ma il portafoglio rimane aperto in memoria. Attivando il blocco primario permette di usare PIN o impronta digitale per sbloccare.","Attributions":"Crediti","Block was scanned and sent successfully":"Il blocco è stato scansionato e inviato con successo.","Block was scanned but failed to process:":"Il blocco è stato scansionato ma l'elaborazione è fallita:","Failed connecting to backend":"Connessione al backend non riuscita","Failed connecting to backend, no network?":"Connessione al backend non riuscita, nessuna connessione di rete?","Successfully connected to backend":"Connesso al backend","BCB Account":"BCB  Account","Send BCB to this address":"Invia BCB a questo indirizzo","Please load BCB to donate":"Per favore caricare prima BCB per donare."});
    gettextCatalog.setStrings('ja', {"A member of the team will review your feedback as soon as possible.":"ただちに開発メンバーでいただいた評価を拝読し参考にさせていただきます。","About":"このアプリについて","Account Information":"アカウント情報","Account Name":"アカウント名","Account Settings":"アカウント設定","Account name":"アカウント名","Accounts":"アカウント一覧","Add Contact":"連絡先を追加","Add account":"アカウントを追加","Add as a contact":"連絡先に追加","Add description":"詳細を追加","Address Book":"アドレス帳","Advanced":"上級者向け","Advanced Settings":"詳細の設定","Allow Camera Access":"カメラへのアクセスを許可","Allow notifications":"通知を許可する","Almost done! Let's review.":"ほぼ完了!確認してみましょう。","Alternative Currency":"表示通貨","Amount":"金額","Are you being watched?":"見られていませんか？","Are you sure you want to delete this contact?":"本当にこの連絡先を削除しますか？","Are you sure you want to delete this wallet?":"本当にこのウォレットを削除しても\n宜しいですか？","Are you sure you want to skip it?":"本当にバックアップの手順を飛ばしても良いですか？","Backup Needed":"要バックアップ","Backup now":"今すぐバックアップ","Backup wallet":"ウォレットをバックアップ","Browser unsupported":"ブラウザ未対応","Buy &amp; Sell Bitcoin":"ビットコインの購入&amp;売却","Cancel":"キャンセル","Cannot Create Wallet":"ウォレットを作成できません。","Choose a backup file from your computer":"パソコンからバックアップファイルを選択して下さい。","Click to send":"クリックして送る","Close":"閉じる","Coin":"別通貨切り替え","Color":"色","Commit hash":"コミットのハッシュ値","Confirm":"確認","Confirm &amp; Finish":"承諾して終了する","Contacts":"連絡先","Continue":"続ける","Contribute Translations":"翻訳に協力","Copied to clipboard":"クリップボードにコピーしました","Copy this text as it is to a safe place (notepad or email)":"このテキストを安全な場所に貼り付けて保管して下さい (メモ帳やメールの下書きなど)","Copy to clipboard":"クリップボードへコピー","Could not access the wallet at the server. Please check:":"サーバーにてウォレットの確認ができませんでした。こちらをご確認下さい:","Create Account":"アカウントを作成します","Creating Wallet...":"ウォレット作成中…","Creating account...":"アカウントを作成しています...","Creating transaction":"取引作成中…","Date":"日付","Default Account":"デフォルトアカウント","Delete":"削除する","Delete Account":"アカウントを削除します","Delete Wallet":"ウォレットを削除","Deleting Wallet...":"ウォレット削除中…","Do it later":"後で行う","Download":"ダウンロード","Edit":"編集","Email":"電子メール","Email Address":"メールアドレス","Enable camera access in your device settings to get started.":"端末の設定でカメラの使用許可をしないとスキャンができません。","Enable email notifications":"メール通知を有効化","Enable push notifications":"プッシュ通知を有効化","Enable the camera to get started.":"始めるためにカメラを有効にして下さい。","Enter amount":"金額を入力","Enter your password":"パスワードを入力して下さい。","Error":"エラー","Error at confirm":"確認のエラー","Error scanning funds:":"残高確認に失敗しました","Error sweeping wallet:":"ペーパーウォレット出金時にエラー","Export wallet":"ウォレットをエクスポート","Extracting Wallet information...":"ウォレット情報を抽出中…","Failed to export":"エクスポートに失敗しました。","Family vacation funds":"家族旅行貯金","Feedback could not be submitted. Please try again later.":"フォームを送信する事ができませんでした。時間をおいて再試行ください。","File/Text":"ファイル/テキスト","Filter setting":"フィルタ設定","Finger Scan Failed":"指紋認証に失敗しました","Finish":"完了","From":"送信者","Funds found:":"残高がありました:","Funds transferred":"入金されました","Funds will be transferred to":"送金先","Get started":{"button":"始めよう"},"Get started by adding your first one.":"初めての連絡先を追加しましょう。","Go Back":"戻る","Go back":"戻る","Got it":"分かりました","Help & Support":"ヘルプ＆サポート","Help and support information is available at the website.":"サポートに関する情報はウェブサイトに掲載しております。","Hide Balance":"残高を非表示","Home":"ホーム","How could we improve your experience?":"このアプリを改善するためにご意見下さい。","I don't like it":"好きではない","I have read, understood, and agree with the Terms of use.":"利用規約をよく読み、理解し、同意します。","I like the app":"このアプリが好き","I think this app is terrible.":"このアプリは最悪です!","I understand":"承知しました","I understand that my funds are held securely on this device, not by a company.":"自分のビットコインがこの端末に入っていて、外部のサーバー等に保管は一切されていないことを理解しています。","I've written it down":"紙に書き留めました","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"他にご意見などありましたら、設定画面の「フィードバックの送信」をタップして下さい。","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"画面写真を撮ってしまうと、その時点で他のアプリに見られるようになりますので、そのアプリの運営者が安易にビットコインを全て盗めます。安全にバックアップを取るには、紙とボールペンで書き留めましょう。","Import Wallet":"ウォレットをインポート","Import wallet":"ウォレットをインポート","Importing Wallet...":"ウォレットインポート中…","In order to verify your wallet backup, please type your password.":"ウォレットのバックアップを確認するためには、復元フレーズ用のパスワードをご入力下さい。","Incomplete":"未完成","Insufficient funds":"残高不足","Invalid":"無効","Is there anything we could do better?":"もっと頑張って欲しいところはありますか？","Language":"言語設定","Learn more":"詳細情報","Loading transaction info...":"取引情報の読み込み中...","Log options":"ログの設定","Makes sense":"わかりました","Matches:":"結果:","Meh - it's alright":"まあまあです","Memo":"メモ","More Options":"その他オプション","Name":"名前","New account":"新しいアカウント","No contacts yet":"連絡先が無い","No entries for this log level":"このレベルのログのエントリーがありません。","No recent transactions":"最近の取引がありません","No transactions yet":"取引がありません","No wallet found":"ウォレットが見つかりません","No wallet selected":"ウォレットが選択されていません","No wallets available to receive funds":"ペーパーウォレットの出金を受け取るためのウォレットが入っていません。","Not funds found":"残高がありませんでした","Not now":"今はしない","Note":"メモ","Notifications":"通知設定","Notify me when transactions are confirmed":"取引が承認されたら通知する。","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"お金を受け取る前に、このウォレットのバックアップを取っておくことを強くオススメします。一ウォレットごとにバックアップは一回です。バックアップを取らないまま、この端末が紛失・故障されてしまったら全残高が消失されてしまいます。","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"今一度周りの環境をよく見てみましょう。隠しカメラ、窓、覗いてくる人などありませんか？","OK":"OK","OKAY":"OK","Official English Disclaimer":"公式免責事項 (英語)","Oh no!":"おっと!","Open":"開く","Open GitHub":"GitHubを開く","Open GitHub Project":"GitHub のプロジェクトを開く","Open Settings":"設定を開く","Open Website":"サイトを開く","Open website":"サイトを開く","Payment Accepted":"支払いが完了しました","Payment Proposal Created":"送金の提案が作成されました","Payment Received":"送金が受領されました","Payment Rejected":"送金が却下されました","Payment Sent":"送金が完了しました","Permanently delete this wallet.":"ウォレットを完全に削除する","Please connect a camera to get started.":"始めるためにカメラを接続して下さい。","Please, select your backup file":"バックアップファイルを選択","Preferences":"設定","Preparing addresses...":"アドレスを処理中…","Preparing backup...":"バックアップを準備中...","Press again to exit":"もう一度押して終了","Private Key":"秘密鍵","Private key encrypted. Enter password":"秘密鍵は暗号化されています。復号化パスワードを入力して下さい。","Push Notifications":"プッシュ通知","QR Code":"QRコード","Quick review!":"おさらい！","Rate on the app store":"App Storeで評価","Receive":"受取","Received":"受取済み","Recent":"履歴","Recent Transaction Card":"最近の取引カード","Recent Transactions":"最近の取引","Recipient":"受取人","Release information":"リリース情報","Remove":"削除","Restore from backup":"バックアップから復元","Retry":"やり直し","Retry Camera":"カメラを再試行","Save":"保存","Scan":"スキャン","Scan QR Codes":"QRコードを読み取る","Scan again":"もう一度スキャンし直してください。","Scan your fingerprint please":"指紋をスキャンしてください","Scanning Wallet funds...":"ウォレット残高照会中…","Screenshots are not secure":"画面写真を撮ってしまうと危険です！","Search Transactions":"取引を検索","Search transactions":"取引を検索","Search your currency":"通貨を検索","Select a backup file":"バックアップファイルを選択","Select an account":"アカウントを選択します","Send":"送信","Send Feedback":"フィードバックの送信","Send by email":"メールで送信","Send from":"ここから送金","Send max amount":"全残高を送金","Send us feedback instead":"代わりにフィードバックを送信","Sending":"送信中","Sending feedback...":"フィードバックを送信中...","Sending maximum amount":"全残高を送金","Sending transaction":"取引送信中","Sending {{amountStr}} from your {{name}} account":"{{name}}アカウントから{{amountStr}}を送っています","Sent":"送金済み","Services":"サービス","Session Log":"セッションのログ","Session log":"セッションのログ","Settings":"設定","Share the love by inviting your friends.":"是非友達と共有して下さい","Show more":"すべて表示","Signing transaction":"取引署名中","Skip":"スキップ","Slide to send":"スライドして送る","Sweep":"全残高インポート","Sweep paper wallet":"ペーパーウォレットの全残高インポート","Sweeping Wallet...":"ビットコイン回収中…","THIS ACTION CANNOT BE REVERSED":"＊＊＊注意＊＊＊ このアクションを元に戻すことはできません！！！","Tap and hold to show":"長押しで表示","Terms Of Use":"利用規約","Terms of Use":"利用規約","Text":"テキスト","Thank you!":"ありがとうございます!","Thanks!":"ありがとうございます。","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"嬉しい限りです！是非5つ星のアプリを目指したいため、このアプリの改善するにはどうしたら良いと思いますか？","The seed":"種子","There is an error in the form":"フォームにエラーがありました","There's obviously something we're doing wrong.":"このアプリで何か間違ったことをやっているようです。","This app is fantastic!":"このアプリは素晴らしいです!","Timeline":"履歴","To":"宛先","Touch ID Failed":"Touch ID が失敗しました。","Transaction":"取引","Transfer to":"移動先","Transfer to Account":"アカウントに転送","Try again in {{expires}}":"{{expires}} 経過後にもう一度試してください。","Uh oh...":"あら…","Update Available":"利用可能なアップデートあり","Updating... Please stand by":"更新中... お待ち下さい","Verify your identity":"認証を行って下さい","Version":"バージョン","View":"表示","View Terms of Service":"サービス利用規約を表示","View Update":"更新情報を表示","Warning!":"注意！","Watch out!":"注意して下さい！","We'd love to do better.":"サービスを改善していきます","Website":"ウェブサイト","Would you like to receive push notifications about payments?":"送金発生時にプッシュ通知を受け取りますか?","Yes":"はい","Yes, skip":"飛ばす","You can create a backup later from your wallet settings.":"ウォレットの設定から、後でバックアップを作成できます。","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"GitHubのページにて最近の開発動向を見たり、改善案のソースコードの貢献したりすることができます。","You can still export it from Advanced &gt; Export.":"バックアップファイルの作成は「上級者向け」⇒「エクスポート」からアクセスできます。","You'll receive email notifications about payments sent and received from your wallets.":"メールアドレスにウォレットへの入金や出金に関する通知が送られます。","Your ideas, feedback, or comments":"提案、評価、コメントなど","Your password":"パスワード","Your wallet is never saved to cloud storage or standard device backups.":"ウォレットは一度もクラウドへ保存されたりすることはありませんし、携帯電話などに付いている標準バックアップ機能ではバックアップされません！！！！","[Balance Hidden]":"[残高非表示中]","Let's Start":"始めましょう","Send BCB":"ナノを送ります","Start sending BCB":"ナノを送り始める","To get started, you need BCB. Share your account to receive BCB.":"始めるためにナノが必要です。ナノを受け取るためにアカウントを共有する。","BCB is Feeless":"ナノは料金を取りません","BCB is Instant":"ナノは即時です","BCB is Secure":"ナノは安全です"});
    gettextCatalog.setStrings('nb', {"A member of the team will review your feedback as soon as possible.":"Et teammedlem vil gjennomgå din tilbakemelding så raskt som mulig","About":"Om","Account Information":"Kontoinformasjon","Account Name":"Kontonavn","Account Settings":"Kontoinnstillinger","Account name":"Kontonavn","Accounts":"Kontoer","Add Contact":"Legg til kontakt","Add account":"Legg til konto","Add as a contact":"Legg til som kontakt","Add description":"Legg til beskrivelse","Address Book":"Adressebok","Advanced":"Avansert","Advanced Settings":"Avanserte innstillinger","Allow Camera Access":"Tillat kameratilgang","Allow notifications":"Tillat varslinger","Almost done! Let's review.":"Nesten ferdig! La oss gå igjennom.","Alternative Currency":"Referansevaluta","Amount":"Beløp","Are you being watched?":"Blir du overvåket?","Are you sure you want to delete this contact?":"Er du sikker på at du vil slette denne kontakten?","Are you sure you want to delete this wallet?":"Er du sikker på at du vil slette denne lommeboken?","Are you sure you want to skip it?":"Er du sikker på at du vil hoppe over denne?","Backup Needed":"Sikkerhetskopi nødvendig","Backup now":"Sikkerhetskopier nå","Backup wallet":"Sikkerhetskopier lommebok","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Pass på å lagre hovednøkkelen på et sikkert sted. Dersom denne appen blir slettet, eller enheten din blir stjålet, så er hovednøkkelen eneste måte å gjenopprette lommeboka.","Browser unsupported":"Nettleser ikke støttet","But do not lose your seed!":"Men ikke mist hovednøkkelen din!","Buy &amp; Sell Bitcoin":"Kjøp og selg Bitcoin","Cancel":"Avbryt","Cannot Create Wallet":"Kan ikke opprette lommebok","Choose a backup file from your computer":"Velg en sikkerhetskopi-fil fra din datamaskin","Click to send":"Klikk for å sende","Close":"Lukk","Coin":"Mynt","Color":"Farge","Commit hash":"Commit-hash","Confirm":"Bekreft","Confirm &amp; Finish":"Bekreft og avslutt","Contacts":"Kontakter","Continue":"Fortsett","Contribute Translations":"Bidra med oversettelser","Copied to clipboard":"Kopiert til utklippstavle","Copy this text as it is to a safe place (notepad or email)":"Kopier denne teksten som den er til et sikkert sted (notatblokk eller epost)","Copy to clipboard":"Kopier til utklippstavle","Could not access the wallet at the server. Please check:":"Får ikke tilgang til lommeboka på serveren. Vennligst kontroller:","Create Account":"Opprett konto","Create new account":"Opprett ny konto","Creating Wallet...":"Oppretter lommebok...","Creating account...":"Oppretter konto...","Creating transaction":"Oppretter transaksjon","Date":"Dato","Default Account":"Standardkonto","Delete":"Slett","Delete Account":"Slett konto","Delete Wallet":"Slett lommebok","Deleting Wallet...":"Sletter lommebok...","Do it later":"Gjør det senere","Donate to Bitcoin Black":"Donere til Canoe","Download":"Last ned","Edit":"Rediger","Email":"Epost","Email Address":"Epostadresse","Enable camera access in your device settings to get started.":"Aktiver kameratilgang i dine enhetsinnstillinger for å komme igang.","Enable email notifications":"Aktiver epostvarsel","Enable push notifications":"Aktiver push-varsler","Enable the camera to get started.":"Aktiver kamera for å starte.","Enter amount":"Skriv inn beløp","Enter wallet seed":"Skriv inn lommebokens hovednøkkel","Enter your password":"Skriv inn ditt passord","Error":"Feil","Error at confirm":"Feil under bekreftelse","Error scanning funds:":"Feil under skanning av midler:","Error sweeping wallet:":"Feil under sveiping av lommebok:","Export wallet":"Eksporter lommebok","Extracting Wallet information...":"Hent ut informasjon om lommebok...","Failed to export":"Eksportering feilet","Family vacation funds":"Familiens feriebudsjett","Feedback could not be submitted. Please try again later.":"Tilbakemelding kunne ikke sendes. Vennligst prøv igjen senere.","File/Text":"Fil/Tekst","Filter setting":"Filtrer innstilling","Finger Scan Failed":"Fingeravlesing feilet","Finish":"Klart","From":"Fra","Funds found:":"Midler funnet:","Funds transferred":"Midler overført","Funds will be transferred to":"Midler vil bli overført til","Get started":{"button":"Kom igang"},"Get started by adding your first one.":"Kom igang ved å legge til din første.","Go Back":"Gå tilbake","Go back":"Gå tilbake","Got it":"Forstått","Help & Support":"Hjelp og støtte","Help and support information is available at the website.":"Hjelp og støtte-informasjon er tilgjengelig på nettsiden.","Hide Balance":"Skjul balanse","Home":"Hjem","How could we improve your experience?":"Hvordan kan vi forbedre din opplevelse?","I don't like it":"Jeg liker det ikke","I have read, understood, and agree with the Terms of use.":"Jeg har lest, forstått og aksepterer brukervilkårene","I like the app":"Jeg liker denne appen.","I think this app is terrible.":"Jeg synes denne appen er forferdelig.","I understand":"Jeg forstår","I understand that my funds are held securely on this device, not by a company.":"Jeg forstår at mine midler er sikret og lagret på denne enheten, og ikke av et firma.","I've written it down":"Jeg har skrevet det ned","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Dersom denne enheten blir erstattet eller appen slettes, kan verdiene ikke bli gjenopprettet uten en sikkerhetskopi.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Dersom du har ytterligere tilbakemelding, vennligst informer oss ved å trykke \"send tilbakemelding\"-valget i innstillings-fanen.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Hvis du tar et skjermbilde, så kan din sikkerhetskopi sees av andre applikasjoner. Du kan lage en trygg sikkerhetskopi med fysisk penn og papir.","Import Wallet":"Importer lommebok","Import seed":"Importer hovednøkkel","Import wallet":"Importer lommebok","Importing Wallet...":"Importerer lommebok...","In order to verify your wallet backup, please type your password.":"Skriv inn passordet ditt for å verifisere din lommebok-sikkerhetskopi.","Incomplete":"Uferdig","Insufficient funds":"Utilstrekkelige midler","Invalid":"Ugyldig","Is there anything we could do better?":"Er det noe vi kunne gjort bedre?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Det er viktig at du skriver ned lommebokens hovednøkkel korrekt. Dersom noe hender med lommeboka di, så trenger du dette seedet for å rekonstruere den. Vennligst se over hovednøkkelen ditt og prøv igjen.","Language":"Språk","Learn more":"Lær mer","Loading transaction info...":"Laster transaksjonsinfo...","Log options":"Loggvalg","Makes sense":"Det gir mening","Matches:":"Treff:","Meh - it's alright":"Tja - det er OK","Memo":"Memoar","More Options":"Flere valg","Name":"Navn","New account":"Ny konto","No Account available":"Ingen konto tilgjengelig","No contacts yet":"Ingen kontakter enda","No entries for this log level":"Ingen oppføringer for dette loggnivået","No recent transactions":"Ingen nylige transaksjoner","No transactions yet":"Ingen transaksjoner enda","No wallet found":"Ingen lommebok funnet","No wallet selected":"Ingen lommebok valgt","No wallets available to receive funds":"Ingen lomebøker er tilgjengelige for å motta midler","Not funds found":"Ingen midler funnet","Not now":"Ikke nå","Note":"Notat","Notifications":"Varslinger","Notify me when transactions are confirmed":"Informer meg når transaksjonen er bekreftet","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Nå er det på tide å ta en sikkerhetskopi av lommeboka. Dersom du mister denne enheten, er det umulig å få tilgang på dine midler uten en sikkerhetskopi.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Nå er det på tide å se seg om. Er det vinduer i nærheten, skjulte kameraer eller noen som ser deg over skulderen?","Numbers and letters like 904A2CE76...":"Tall og bokstaver som 904A2CE76...","OK":"OK","OKAY":"OK","Official English Disclaimer":"Offisiell engelsk ansvarsfraskrivelse","Oh no!":"Å nei!","Open":"Åpne","Open GitHub":"Åpne GitHub","Open GitHub Project":"Åpne GitHub-prosjektet","Open Settings":"Åpne innstillinger","Open Website":"Åpne nettside","Open website":"Åpne nettside","Paste the backup plain text":"Lim inn sikkerhetskopien som vanlig tekst","Payment Accepted":"Betaling akseptert","Payment Proposal Created":"Betalingsforslag opprettet","Payment Received":"Betaling mottatt","Payment Rejected":"Betaling avvist","Payment Sent":"Betaling sendt","Permanently delete this wallet.":"Slett denne lommeboken permanent.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Skriv nøye ned denne hovednøkkelen på 64 tegn. Klikk for å kopiere til utklippstavlen.","Please connect a camera to get started.":"Vennligst koble til et kamera for å komme igang.","Please enter the seed":"Vennligst skriv inn hovednøkkelen","Please, select your backup file":"Vennligst velg filen med din sikkerhetskopi","Preferences":"Preferanser","Preparing addresses...":"Forbereder adresser...","Preparing backup...":"Forbereder sikkerhetskopi...","Press again to exit":"Trykk igjen for å lukke","Private Key":"Privatnøkkel","Private key encrypted. Enter password":"Privatnøkkel er kryptert. Skriv inn passord","Push Notifications":"Push-varsler","QR Code":"QR-kode","Quick review!":"Rask gjennomgang!","Rate on the app store":"Gi en rating i app butikken","Receive":"Motta","Received":"Mottatt","Recent":"Nylig","Recent Transaction Card":"Nylig transaksjonskort","Recent Transactions":"Nylige transaksjoner","Recipient":"Mottager","Release information":"Utgivelsesinformasjon","Remove":"Fjern","Restore from backup":"Gjennopprett fra sikkerhetskopi","Retry":"Prøv igjen","Retry Camera":"Prøv kamera igjen","Save":"Lagre","Scan":"Skanne","Scan QR Codes":"Skanne QR-koder","Scan again":"Skann igjen","Scan your fingerprint please":"Vennligst skann ditt fingeravtrykk","Scanning Wallet funds...":"Skanner lommebokens innhold...","Screenshots are not secure":"Skjermdumper er ikke sikre","Search Transactions":"Søk i transaksjoner","Search or enter account number":"Søk eller skriv inn kontonummer","Search transactions":"Søk i transaksjoner","Search your currency":"Finn din valuta","Select a backup file":"Velg fil for sikkerhetskopi","Select an account":"Velg en konto","Send":"Send","Send Feedback":"Gi tilbakemelding","Send by email":"Send via epost","Send from":"Send fra","Send max amount":"Send maksbeløp","Send us feedback instead":"Send oss tilbakemelding i stedet","Sending":"Sender","Sending feedback...":"Sender tilbakemelding","Sending maximum amount":"Sender maks beløp","Sending transaction":"Sender transaksjon","Sending {{amountStr}} from your {{name}} account":"Sender {{amountStr}} fra din konto {{name}}","Sent":"Sendt","Services":"Tjenester","Session Log":"Øktlogg","Session log":"Øktlogg","Settings":"Innstillinger","Share the love by inviting your friends.":"Del på kjærligheten ved å invitere dine venner.","Show Account":"Vis konto","Show more":"Vis mer","Signing transaction":"Signer transaksjon","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Siden bare du kontrollerer dine penger, så må du lagre hovednøkkelen til din lommebok i tilfelle appen blir slettet.","Skip":"Hopp over","Slide to send":"Dra for å sende","Sweep":"Sveip","Sweep paper wallet":"Sveip papirlommebok","Sweeping Wallet...":"Sveiper lommebok...","THIS ACTION CANNOT BE REVERSED":"DENNE HANDLINGEN KAN IKKE REVERSERES","Tap and hold to show":"Trykk og hold for å vise","Terms Of Use":"Brukervilkår","Terms of Use":"Brukervilkår","Text":"Tekst","Thank you!":"Takk!","Thanks!":"Takk!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Det var hyggelig å høre. Vi vil gjerne finne ut hva vi kan gjøre for å fortjene den femte stjernen fra deg - hvordan kan vi forbedre din opplevelse?","The seed":"Hovednøkkelen","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Hovednøkkelen er ikke gyldig, det må være 64 tegn av typen: 0-9, A-F","The wallet server URL":"Lommebokens server-URL","There is an error in the form":"Det er en feil i skjemaet","There's obviously something we're doing wrong.":"Det er tydelig at vi gjør noe feil.","This app is fantastic!":"Denne appen er fantastisk!","Timeline":"Tidslinje","To":"Til","Touch ID Failed":"Touch ID feilet","Transaction":"Transaksjon","Transfer to":"Send til","Transfer to Account":"Send til konto","Try again in {{expires}}":"Prøv igjen om {{expires}}","Uh oh...":"Å nei...","Update Available":"Oppdatering tilgjengelig","Updating... Please stand by":"Oppdaterer... Vennligst vent","Verify your identity":"Bekreft din identitet","Version":"Versjon","View":"Se","View Terms of Service":"Se brukervilkår","View Update":"Se oppdatering","Wallet Accounts":"Kontoer for lommebøker","Wallet File":"Lommebokfil","Wallet Seed":"Lommebokens hovednøkkel","Wallet seed not available":"Lommebokens hovednøkkel ikke tilgjengelig","Warning!":"Advarsel!","Watch out!":"Pass opp!","We'd love to do better.":"Vi vil gjerne forbedre oss.","Website":"Nettside","What do you call this account?":"Hva vil du kalle denne kontoen?","Would you like to receive push notifications about payments?":"Ønsker du å motta push-varslinger om betalinger?","Yes":"Ja","Yes, skip":"Ja, hopp over","You can change the name displayed on this device below.":"Du kan endre navnet som vises på denne enheten under.","You can create a backup later from your wallet settings.":"Du kan lage en sikkerhetskopi senere via dine innstillinger for lommebok.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Du kan se den siste utviklingen og bidra til denne åpne kildekode appen ved å besøke prosjektsiden på GitHub.","You can still export it from Advanced &gt; Export.":"Du kan fortsatt eksportere den fra Avansert &gt; Eksport.","You'll receive email notifications about payments sent and received from your wallets.":"Du vil motta epost-varsel om betalinger til/fra dine lommebøker.","Your ideas, feedback, or comments":"Dine ideer, tilbakemeldinger, eller kommentarer","Your password":"Ditt passord","Your wallet is never saved to cloud storage or standard device backups.":"Din lommebok lagres aldri i skylagring eller på vanlig enhets-backup.","[Balance Hidden]":"[Saldo Skjult]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Jeg har lest, forstått og aksepterer <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Brukervilkårene</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"5-stjerne rangering hjelper oss å få Canoe til flere hender, og flere brukere betyr at mer ressurser kan forplikte seg til appen!","At least 8 Characters. Make it good!":"Minst 8 tegn. Gjør det bra!","Change Password":"Endre passord","Confirm New Password":"Bekreft nytt passord","How do you like Canoe?":"Hva synes du om Canoe?","Let's Start":"La oss begynne","New Password":"Nytt passord","Old Password":"Gammelt passord","One more time.":"En gang til.","Password too short":"Passordet er for kort","Passwords don't match":"Passordene stemmer ikke","Passwords match":"Passordene stemmer","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Push-varsler for Canoe er deaktivert. Aktiver dem i innstillings-appen.","Share Canoe":"Del Canoe","There is a new version of Canoe available":"En ny versjon av Canoe er tilgjengelig","We're always looking for ways to improve Canoe.":"Vi er alltid på jakt etter nye måter å forbedre Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Vi er alltid på jakt etter nye måter å gjøre Canoe bedre. Hvordan kan vi forbedre din opplevelse?","Would you be willing to rate Canoe in the app store?":"Er du villig til å anmelde Canoe i app butikken?","Account Alias":"Konto-alias","Account Color":"Konto-farge","Alias":"Alias","Backup seed":"Sikkerhetskopier hovednøkkel","Create Wallet":"Opprett lommebok","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Finner du ikke ditt språk? Meld deg inn hos POEditor! Vi ønsker gjerne å ha støtte for ditt språk.","Edit Contact":"Rediger kontakt","Enter password":"Skriv inn passord","Incorrect password, try again.":"Feil passord, prøv igjen.","Joe Doe":"Ola Nordmann","Join the future of money,<br>get started with BCB.":"Bli med i pengenes framtid,<br>kom igang med BCB.","Lock wallet":"Lås Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB er annerledes &ndash; det kan ikke lagres trygt hos en bank eller nettjeneste","No accounts available":"Ingen konto tilgjengelig","No backup, no BCB.":"Ingen sikkerhetskopi, ingen BCB.","Open POEditor":"Åpne POEditor","Open Translation Site":"Åpne oversettelsesside","Password to decrypt":"Passord for å dekryptere","Password to encrypt":"Passord å kryptere","Please enter a password to use for the wallet":"Vennligst skriv inn ett passord som kan brukes til lommeboka","Repair":"Reparer","Send BCB":"Send BCB","Start sending BCB":"Start å bruke BCB","To get started, you need BCB. Share your account to receive BCB.":"For å komme igang, trenger du BCB. Del din konto for å motta BCB.","To get started, you need an Account in your wallet to receive BCB.":"For å starte, trenger du en Konto i din lommebok for å motta BCB.","Type below to see if an alias is free to use.":"Skriv inn under for å se om et alias er tilgjengelig.","Use Server Side PoW":"Bruk serverside-PoW","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Vi ser alltid etter oversettelsesbidrag! Du kan utføre rettelser eller hjelpe til med å gjøre denne appen tilgjengelig på ditt språk ved å bli med oss hos POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Du kan bidra med oversettelser ved å melde deg inn på vårt oversettelsesprosjekt hos POEditor. Vi ser frem til å høre fra deg!","You can scan BCB addresses, payment requests and more.":"Du kan skanne BCB adresser, betalingsforespørsler og annet.","Your Bitcoin Black Betanet Wallet is ready!":"Din BCB-lommebok er klar!","Your BCB wallet seed is backed up!":"Din BCB-lommebok-hovednøkkel er sikkerhetskopiert!","Account":"Konto","An account already exists with that name":"En konto eksisterer allerede med det navnet","Confirm your PIN":"Bekreft din PIN","Enter a descriptive name":"Skriv inn et beskrivende navn","Failed to generate seed QR code":"Mislykket generering av QR-kode","Incorrect PIN, try again.":"Feil PIN, prøv igjen","Incorrect code format for a seed:":"Feil kodeformat for en hovednøkkel:","Information":"Informasjon","Not a seed QR code:":"Ikke en QR-kode for en hovednøkkel:","Please enter your PIN":"Vennligst skriv inn din PIN","Scan this QR code to import seed into another application":"Skann denne QR-koden for å importere hovednøkkelen i en annen applikasjon","Security Preferences":"Sikkerhetsinnstillinger","Your current password":"Ditt nåværende passord","Your password has been changed":"Ditt passord er endret","Canoe stores your BCB using cutting-edge security.":"Canoe lagrer dine BCB ved hjelp av banebrytende sikkerhet","Caution":"Forsiktighet","Decrypting wallet...":"Dektrypterer lommebok...","Error after loading wallet:":"Feil etter lasting av lommebok:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Jeg forstår at dersom denne appen blir slettet, så kan jeg bare få tilbake lommeboka dersom jeg har hovednøkkelen eller en fil med sikkerhetskopi av lommeboka.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Importering av lommebok fjerner din nåværende lommebok og alle tilhørende kontoer. Du ønsker muligens å ta en backup av ditt nåværende hovednøkkel eller lage en fil med sikkerhetskopi av lommeboka.","Incorrect code format for an account:":"Feil kodeformat for en konto:","Just scan and pay.":"Bare skann og betal.","Manage":"Administrer","BCB is Feeless":"BCB har ingen avgifter","BCB is Instant":"BCB er øyeblikkelig","BCB is Secure":"BCB er sikkert","Never pay transfer fees again!":"Ingen flere transaksjonsavgifter!","Support":"Brukerstøtte","Trade BCB for other currencies like USD or Euros.":"Veksle BCB til andre valutaer som USD eller euro.","Transfer BCB instantly to anyone, anywhere.":"Overfør BCB øyeblikkelig til hvem som helst, hvor som helst.","Account Representative":"Konto-representant","Add to address book?":"Legg til i adresseboken?","Alias Found!":"Alias funnet!","At least 3 Characters.":"Minst tre tegn.","Checking availablity":"Sjekker tilgjengelighet","Create Alias":"Opprett alias","Creating Alias...":"Oppretter alias...","Do you want to add this new address to your address book?":"Ønsker du å legge til denne nye adressen i adresseboka?","Edit your alias.":"Rediger ditt alias.","Editing Alias...":"Redigerer alias...","Email for recovering your alias":"Epost for å gjennopprette ditt alias","Enter a representative account.":"Skriv in representantkontoen.","Error importing wallet:":"Feil i importering av lommebok:","How to buy BCB":"Hvordan kjøpe BCB","How to buy and sell BCB is described at the website.":"Hvordan man kjøper og selger BCB er beskrevet på nettsiden.","Invalid Alias!":"Feil alias!","Invalid Email!":"Feil epost!","Let People Easily Find you With Aliases":"La folk enkelt finne deg ved hjelp av aliaser","Link my wallet to my phone number.":"Knytt min lommebok til mitt telefonnummer","Looking up @{{addressbookEntry.alias}}":"Finn @{{adressbookEntry.alias}}","Make my alias private.":"Gjør alias privat.","Refund":"Refundering","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Det kan ta tid å reparere din lommebok. Dette vil laste alle blokk-kjedene tilknyttet din lommebok på nytt. Er du sikker på at du ønsker å reparere?","Representative":"Representant","Representative changed":"Representanten er endret","That alias is taken!":"Aliaset er allerede i bruk!","The official English Terms of Service are available on the Canoe website.":"De offisielle Brukervilkårene på Engelsk er tilgjengelige på Canoe sin nettside.","Valid Alias & Email":"Gyldig alias og epost","View Block on BCB Block Explorer":"Se blokken hos BCB Block Explorer","View on BCB Block Explorer":"Se hos BCB Block Explorer","What alias would you like to reserve?":"Hvilket alias ønsker du å reservere?","You can change your alias, email, or privacy settings.":"Du kan endre ditt alias, epost, eller personvernsinnstillinger.","Your old password was not entered correctly":"Ditt gamle passord var ikke korrekt","joe.doe@example.com":"ola.nordmann@eksempel.no","joedoe":"olanordmann","Wallet is Locked":"Canoe er låst","Forgot Password?":"Glemt passordet?","4-digit PIN":"Firesifret PIN-kode","Anyone with your seed can access or spend your BCB.":"Hvem som helst som har ditt seed kan få tilgang til og bruke dine BCB.","Background Behaviour":"Bakgrunnsadferd","Change 4-digit PIN":"Endre firesifret PIN-kode","Change Lock Settings":"Endre låseinnstillinger","Fingerprint":"Fingeravtrykk","Go back to onboarding.":"Gå tilbake til innføringsprogrammet.","Hard Lock":"Hard lås","Hard Timeout":"Hardt tidsavbrudd","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Hvis aktivert, så er Proof of Work delegert til Canoe sin server. Dette valget er deaktivert, og alltid sant på mobil Canoe enn så lenge.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Hvis aktivert, så vil en liste over transaksjoner fra alle lommebøker vises i hjemmefanen. For tiden deaktivert, ettersom full implementasjon mangler.","Lock when going to background":"Lås når appen går i bakgrunnen","None":"Ingen","Password":"Passord","Saved":"Lagret","Soft Lock":"Myk lås","Soft Lock Type":"Myk låstype","Soft Timeout":"Mykt tidsavbrudd","Timeout in seconds":"Tidsavbrudd i sekunder","Unrecognized data":"Kjenner ikke igjen data","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Hard lås</h5>\n          Med hard lås krypterer Canoe lommeboken og fjerner den fullstendig fra minnet. Du kan ikke skru av hard låsing, men du kan sette et veldig langt tidsavbrudd.","A new version of this app is available. Please update to the latest version.":"En ny versjon av denne appen er tilgjengelig. Vennligst oppdater til nyeste versjon.","Backend URL":"Backend-URL","Change Backend":"Endre backend","Change Backend Server":"Endre backend-server","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Å importere en lommebok vil fjerne din eksisterende lommebok og kontoer! Dersom du har verdier i din nåværende lommebok, se til at denne kan gjenopprettes fra en sikkerhetskopi. Skriv \"slett\" for å bekrefte at du ønsker å slette din nåværende lommebok.","Max":"Maks","delete":"slett","bitcoin.black":"bitcoin.black","Confirm Password":"Bekreft Passord","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Går du tilbake til innføringsprogrammet mister du dine eksisterende lommebøker og kontoer! Dersom du har midler i din nåværende lommebok, så forsikre deg om at du har en sikkerhetskopi du kan gjennopprette fra. Skriv inn \"delete\" for å bekrefte at du ønsker å slette din nåværende lommebok.","Please enter a password of at least 8 characters":"Vennligst skriv inn et passord på minst 8 tegn","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"På denne skjermen kan du se alle dine kontoer. Sjekk våre <a ng-click=\"openExternalLinkHelp()\">FAQs</a> før du starter!","Play Sounds":"Spill Lyder","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">Bakgrunnsoppførsel</h5>\n            <p translate=\"\">Velg låstype å bruke når Canoe sendes til bakgrunnen. For å deaktivere bakgrunnslås velg Ingen.</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":"<h5 class=\"toggle-label\" translate=\"\">Myklås</h5>          <p translate=\"\">Med Myklås, så er Canoe låst men lommeboken er fortsatt i live ukryptert i minnet. Aktivering av Myklås gjør det mulig å bruke enklere former for legitimering, slik som PIN og fingeravtrykk.</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Velg låstype til når Canoe går i bakgrunnen. For å deaktivere bakgrunnslås velg Ingen.","Encryption Time!":"Krypteringstid!","Enter at least 8 characters to encrypt your wallet.":"Skriv inn minst 8 tegn for å kryptere din lommebok.","Password length ok":"Passordets lengde er OK","Passwords do not match":"Passordene er ikke like","Unlock":"Lås opp","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Med Myklås, så er Canoe låst men lommeboken er fortsatt i live ukryptert i minnet. Aktivering av Myklås gjør det mulig å bruke enklere former for legitimering, slik som PIN og fingeravtrykk.","Attributions":"Attribusjoner","Block was scanned and sent successfully":"Suksessfull skanning og sending av blokk","Block was scanned but failed to process:":"Blokken ble skannet men prosessering feilet:","Failed connecting to backend":"Kunne ikke koble til bakgrunnsmotor","Failed connecting to backend, no network?":"Kunne ikke koble til bakgrunnsmotor, inget nettverk?","Successfully connected to backend":"Suksessfull tilkobling til bakgrunnsmotor","BCB Account":"BCB Konto","Send BCB to this address":"Send BCB til denne adressen"});
    gettextCatalog.setStrings('nl', {"A member of the team will review your feedback as soon as possible.":"Een lid van het team zal zo spoedig mogelijk je feedback bekijken.","About":"Over","Account Information":"Rekening Informatie","Account Name":"Rekening Naam","Account Settings":"Rekening Instellingen","Account name":"Rekening naam","Accounts":"Rekeningen","Add Contact":"Contactpersoon toevoegen","Add account":"Rekening toevoegen","Add as a contact":"Toevoegen als contactpersoon","Add description":"Beschrijving toevoegen","Address Book":"Adresboek","Advanced":"Geavanceerd","Advanced Settings":"Geavanceerde Instellingen","Allow Camera Access":"Camera Toegang Toestaan","Allow notifications":"Meldingen toestaan","Almost done! Let's review.":"Bijna klaar! Nog eens nakijken.","Alternative Currency":"Alternatieve Valuta","Amount":"Bedrag","Are you being watched?":"Kijkt er iemand mee?","Are you sure you want to delete this contact?":"Weet je zeker dat je deze contactpersoon wil verwijderen?","Are you sure you want to delete this wallet?":"Weet je zeker dat je deze wallet wil verwijderen?","Are you sure you want to skip it?":"Weet je zeker dat je dit wil overslaan?","Backup Needed":"Back-up Nodig","Backup now":"Back-up maken","Backup wallet":"Back-up van wallet maken","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Zorg dat je jouw seed op een veilige plaats opbergt. Als deze app is verwijderd of je telefoon is gestolen, is het alleen mogelijk om met de seed de wallet \nopnieuw te maken.","Browser unsupported":"Browser niet ondersteund","But do not lose your seed!":"Maar.. Raak je seed niet kwijt!","Buy &amp; Sell Bitcoin":"Koop &amp; Verkoop Bitcoin","Cancel":"Annuleren","Cannot Create Wallet":"Kan Wallet Niet Aanmaken","Choose a backup file from your computer":"Kies een back-up bestand op je computer","Click to send":"Klik om te verzenden","Close":"Sluiten","Coin":"Valuta","Color":"Kleur","Commit hash":"Commit hash","Confirm":"Bevestigen","Confirm &amp; Finish":"Voltooien","Contacts":"Contactpersonen","Continue":"Ga verder","Contribute Translations":"Bijdragen aan Vertalingen","Copied to clipboard":"Gekopieerd naar klembord","Copy this text as it is to a safe place (notepad or email)":"Kopieer deze tekst zonder te wijzigen naar een veilige plek (kladblok of email)","Copy to clipboard":"Naar klembord kopiëren","Could not access the wallet at the server. Please check:":"Kon geen toegang krijgen tot de wallet op de server. Graag dit checken:","Create Account":"Maak een rekening aan","Create new account":"Maak een nieuwe rekening","Creating Wallet...":"Wallet aanmaken...","Creating account...":"Rekening aanmaken..","Creating transaction":"Transactie aanmaken","Date":"Datum","Default Account":"Standaard rekening","Delete":"Verwijderen","Delete Account":"Rekening verwijderen","Delete Wallet":"Wallet verwijderen","Deleting Wallet...":"Wallet verwijderen...","Do it later":"Doe het later","Donate to Bitcoin Black":"Doneer aan Canoe","Download":"Download","Edit":"Bewerken","Email":"E-mail","Email Address":"E-mailadres","Enable camera access in your device settings to get started.":"Schakel camera toegang in vanuit je apparaat instellingen om aan de slag te gaan.","Enable email notifications":"E-mail meldingen inschakelen","Enable push notifications":"Push meldingen inschakelen","Enable the camera to get started.":"Schakel de camera in om aan de slag te gaan.","Enter amount":"Vul bedrag in","Enter wallet seed":"Voer wallet seed in","Enter your password":"Voer je wachtwoord in","Error":"Fout","Error at confirm":"Fout bij bevestigen","Error scanning funds:":"Fout tijdens scannen saldo:","Error sweeping wallet:":"Fout tijdens opnemen saldo wallet:","Export wallet":"Exporteer wallet","Extracting Wallet information...":"Wallet informatie ophalen...","Failed to export":"Exporteren mislukt","Family vacation funds":"bijv. Vakantiepotje, spaarrekening, etc.","Feedback could not be submitted. Please try again later.":"Feedback kon niet worden ingediend. Probeer het later nog eens.","File/Text":"Bestand/Tekst","Filter setting":"Filter instellingen","Finger Scan Failed":"Vingerscan Mislukt","Finish":"Voltooien","From":"Van","Funds found:":"Gevonden saldo:","Funds transferred":"Overgemaakt saldo","Funds will be transferred to":"Saldo zal worden overgemaakt naar","Get started":{"button":"Aan de slag"},"Get started by adding your first one.":"Begin met toevoegen van je eerste adres","Go Back":"Terug","Go back":"Terug","Got it":"Duidelijk","Help & Support":"Hulp & Ondersteuning","Help and support information is available at the website.":"Hulp en ondersteuning is beschikbaar op de website.","Hide Balance":"Verberg Saldo","Home":"Start","How could we improve your experience?":"Hoe zouden wij jouw ervaring kunnen verbeteren?","I don't like it":"Ik vind hem niet goed","I have read, understood, and agree with the Terms of use.":"Ik heb Gebruiksvoorwaarden gelezen en begrepen, en ga ermee akkoord.","I like the app":"De app bevalt mij goed","I think this app is terrible.":"Ik vind de app verschrikkelijk.","I understand":"Ik begrijp het","I understand that my funds are held securely on this device, not by a company.":"Ik begrijp dat mijn saldo veilig op dit apparaat bewaard wordt en niet in handen is van een bedrijf.","I've written it down":"Ik heb het opgeschreven","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Als dit apparaat vervangen wordt, of als de app wordt verwijderd, kan je je BCB niet herstellen zonder back-up.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Als u meer feedback heeft, laat het ons dan weten via de \"Geef feedback\" optie in het tabblad Instellingen.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Als u een screenshot neemt kunnen andere apps mogelijk je back-up zien. Het is veiliger een back-up te maken met pen en papier.","Import Wallet":"Wallet importeren","Import seed":"Seed importeren","Import wallet":"Importeer wallet","Importing Wallet...":"Wallet importeren...","In order to verify your wallet backup, please type your password.":"Vul je wachtwoord in om de back-up van je wallet te verifiëren.","Incomplete":"Onvolledig","Insufficient funds":"Onvoldoende saldo","Invalid":"Ongeldig","Is there anything we could do better?":"Is er iets dat we beter kunnen doen?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Het is belangrijk dat je je wallet seed zorgvuldig opschrijft. Als er iets gebeurt met je wallet heb je deze seed nodig om je wallet te herstellen. Schrijf je seed opnieuw op en probeer het nogmaals.","Language":"Taal","Learn more":"Meer informatie","Loading transaction info...":"Transactie info laden...","Log options":"Log opties","Makes sense":"Klinkt logisch","Matches:":"Overeenkomsten:","Meh - it's alright":"Meh - het is OK","Memo":"Notitie","More Options":"Meer Opties","Name":"Naam","New account":"Nieuwe rekening","No Account available":"Geen rekening beschikbaar","No contacts yet":"Nog geen contactpersonen","No entries for this log level":"Geen items voor dit logboek niveau","No recent transactions":"Geen recente transacties","No transactions yet":"Nog geen transacties","No wallet found":"Geen wallet gevonden","No wallet selected":"Geen wallet geselecteerd","No wallets available to receive funds":"Geen wallet beschikbaar om saldo te ontvangen","Not funds found":"Geen saldo gevonden","Not now":"Niet nu","Note":"Notitie","Notifications":"Meldingen","Notify me when transactions are confirmed":"Geef mij een melding wanneer transacties zijn bevestigd","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Dit is een goed moment om een back-up van de wallet te maken. Als dit apparaat kwijt raakt is het onmogelijk om toegang tot je saldo te krijgen zonder een back-up.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Dit is het juiste moment om je omgeving te bekijken. Ramen in de buurt? Verborgen camera's? Kijkt er iemand mee over je schouder?","Numbers and letters like 904A2CE76...":"Nummers en letters zoals 904A2CE76...","OK":"OK","OKAY":"OK","Official English Disclaimer":"Officiële Engelse Disclaimer","Oh no!":"O nee!","Open":"Openen","Open GitHub":"GitHub openen","Open GitHub Project":"GitHub Project openen","Open Settings":"Instellingen openen","Open Website":"Website Openen","Open website":"Website openen","Paste the backup plain text":"Plak de back-up in plain text","Payment Accepted":"Betaling Geaccepteerd","Payment Proposal Created":"Betalingsvoorstel Aangemaakt","Payment Received":"Betaling Ontvangen","Payment Rejected":"Betaling Afgewezen","Payment Sent":"Betaling Verzonden","Permanently delete this wallet.":"Deze wallet definitief verwijderen.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Bewaar deze seed van 64 karakters zorgvuldig, klik om de seed naar je klembord te kopiëren.","Please connect a camera to get started.":"Sluit een camera aan om aan de slag te gaan.","Please enter the seed":"Voer de seed in","Please, select your backup file":"Selecteer je back-up bestand","Preferences":"Voorkeuren","Preparing addresses...":"Adressen voorbereiden...","Preparing backup...":"Back-up voorbereiden...","Press again to exit":"Druk nogmaals om te sluiten","Private Key":"Privé Sleutel","Private key encrypted. Enter password":"Privé sleutel beveiligd. Voer wachtwoord in","Push Notifications":"Push Meldingen","QR Code":"QR Code","Quick review!":"Kort samenvatten!","Rate on the app store":"Beoordelen in de app store","Receive":"Ontvangen","Received":"Ontvangen","Recent":"Recent","Recent Transaction Card":"Recente Transacties Kaart","Recent Transactions":"Recente Transacties","Recipient":"Ontvanger","Release information":"Release informatie","Remove":"Verwijderen","Restore from backup":"Herstel back-up / Importeer seed","Retry":"Probeer opnieuw","Retry Camera":"Camera opnieuw proberen","Save":"Opslaan","Scan":"Scannen","Scan QR Codes":"Scan QR Codes","Scan again":"Scan opnieuw","Scan your fingerprint please":"Scan uw vingerafdruk","Scanning Wallet funds...":"Saldo Wallet scannen...","Screenshots are not secure":"Screenshots zijn niet veilig","Search Transactions":"Doorzoek Transacties","Search or enter account number":"Zoek of voer rekening adres in","Search transactions":"Doorzoek transacties","Search your currency":"Zoek uw valuta","Select a backup file":"Selecteer een back-up bestand","Select an account":"Selecteer een rekening","Send":"Verzenden","Send Feedback":"Feedback versturen","Send by email":"Verstuur via e-mail","Send from":"Verzenden vanuit","Send max amount":"Verzend maximale hoeveelheid","Send us feedback instead":"Stuur in plaats daarvan feedback","Sending":"Verzenden","Sending feedback...":"Feedback verzenden...","Sending maximum amount":"Maximale hoeveelheid verzenden","Sending transaction":"Transactie verzenden","Sending {{amountStr}} from your {{name}} account":"{{amountStr}} aan het versturen vanaf {{name}}’s rekening","Sent":"Verzonden","Services":"Diensten","Session Log":"Sessie Log","Session log":"Sessie log","Settings":"Instellingen","Share the love by inviting your friends.":"Deel het plezier door uw vrienden uit te nodigen.","Show Account":"Bekijk rekening","Show more":"Meer weergeven","Signing transaction":"Transactie ondertekenen","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Omdat alleen jij beschikking hebt over je geld, moet je je wallet seed goed bewaren voor het geval je de app verwijdert.","Skip":"Overslaan","Slide to send":"Schuiven om te verzenden","Sweep":"Saldo opnemen","Sweep paper wallet":"Saldo papieren wallet opnemen","Sweeping Wallet...":"Saldo Wallet opnemen...","THIS ACTION CANNOT BE REVERSED":"DEZE ACTIE IS ONOMKEERBAAR","Tap and hold to show":"Tik en houd vast om te tonen","Terms Of Use":"Gebruiksvoorwaarden","Terms of Use":"Gebruikersvoorwaarden","Text":"Tekst","Thank you!":"Dank u!","Thanks!":"Bedankt!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Dat is goed om te horen. Wij zouden graag die vijfde ster verdienen - hoe kunnen wij uw ervaring verbeteren?","The seed":"De seed","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Deze seed is ongeldig, seeds bestaan uit de karakters 0-9, A-F","The wallet server URL":"De wallet server URL","There is an error in the form":"Het formulier bevat een fout","There's obviously something we're doing wrong.":"Er is duidelijk iets dat we verkeerd doen.","This app is fantastic!":"Deze app is fantastisch!","Timeline":"Tijdlijn","To":"Naar","Touch ID Failed":"Touch ID Mislukt","Transaction":"Transactie","Transfer to":"Overmaken naar","Transfer to Account":"Verstuur naar rekening","Try again in {{expires}}":"Probeer het nogmaals over {{expires}}","Uh oh...":"Oh oh...","Update Available":"Update Beschikbaar","Updating... Please stand by":"Bijwerken... Een moment geduld","Verify your identity":"Verifieer uw identiteit","Version":"Versie","View":"Weergeven","View Terms of Service":"Toon Algemene Voorwaarden","View Update":"Update Bekijken","Wallet Accounts":"Wallet rekeningen","Wallet File":"Wallet bestand","Wallet Seed":"Wallet seed","Wallet seed not available":"Wallet seed niet beschikbaar","Warning!":"Waarschuwing!","Watch out!":"Pas op!","We'd love to do better.":"Wij doen het graag nog beter.","Website":"Website","What do you call this account?":"Hoe wilt u deze rekening noemen?","Would you like to receive push notifications about payments?":"Wilt u push meldingen ontvangen over betalingen?","Yes":"Ja","Yes, skip":"Ja, overslaan","You can change the name displayed on this device below.":"Je kan de naam die dit apparaat gebruikt hier aanpassen.","You can create a backup later from your wallet settings.":"U kunt later een back-up maken vanuit uw wallet instellingen.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"U kunt de laatste ontwikkelingen volgen en bijdragen aan deze open source app door onze project pagina te bezoeken op GitHub.","You can still export it from Advanced &gt; Export.":"U kunt deze nog steeds exporteren vanuit Geavanceerd &gt; Exporteren.","You'll receive email notifications about payments sent and received from your wallets.":"U zult email meldingen ontvangen over verzonden en ontvangen betalingen van uw wallet.","Your ideas, feedback, or comments":"Je ideeën, feedback of opmerkingen","Your password":"Je wachtwoord","Your wallet is never saved to cloud storage or standard device backups.":"Je wallet wordt nooit opgeslagen in de cloud of in standaard apparaat back-ups.","[Balance Hidden]":"[Saldo Verborgen]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Ik heb de <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">\ngebruiksvoorwaarden</a> gelezen en begrepen en ga ermee akkoord.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Met vijfsterrenbeoordelingen kunnen we meer gebruikers krijgen voor de app, en kunnen we meer middelen inzetten om de app te verbeteren!","At least 8 Characters. Make it good!":"Tenminste 8 tekens.","Change Password":"Verander wachtwoord","Confirm New Password":"Bevestig nieuw wachtwoord","How do you like Canoe?":"Wat vind je van Canoe?","Let's Start":"Beginnen","New Password":"Nieuw wachtwoord","Old Password":"Oud wachtwoord","One more time.":"Nog een keer","Password too short":"Je wachtwoord is te kort","Passwords don't match":"Je wachtwoorden komen niet overeen.","Passwords match":"Wachtwoorden komen overeen.","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Push notificaties zijn op dit moment uitgeschakeld. Schakel ze in via voorkeuren.","Share Canoe":"Deel Canoe","There is a new version of Canoe available":"Er is een nieuwe versie van Canoe beschikbaar!","We're always looking for ways to improve Canoe.":"We zijn altijd op zoek naar manieren om Canoe te verbeteren.","We're always looking for ways to improve Canoe. How could we improve your experience?":"We zijn altijd op zoek naar manieren om Canoe te verbeteren. Hoe kunnen we jouw ervaring verbeteren?","Would you be willing to rate Canoe in the app store?":"Zou je bereid zijn om Canoe te beoordelen in de app store?","Account Alias":"Rekening alias","Account Color":"Rekening Kleur","Alias":"Alias","Backup seed":"Back-up seed","Create Wallet":"Wallet maken","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Jouw taal niet aanwezig? Schrijf je in via POEditor en help mee met vertalen.","Edit Contact":"Contact wijzigen","Enter password":"Wachtwoord invoeren","Incorrect password, try again.":"Wachtwoord onjuist, probeer opnieuw","Joe Doe":"Jan Visser","Join the future of money,<br>get started with BCB.":"De toekomst van geld,<br>aan de slag met BCB.","Lock wallet":"Canoe vergrendelen","BCB is different – it cannot be safely held with a bank or web service.":"BCB is anders &ndash; het kan niet veilig opgeslagen worden bij een bank of web-service.","No accounts available":"Geen rekeningen beschikbaar","No backup, no BCB.":"Geen back-up, geen BCB.","Open POEditor":"POEditor openen","Open Translation Site":"Vertalingswebsite openen","Password to decrypt":"Wachtwoord om te ontcijferen","Password to encrypt":"Wachtwoord om te beveiligen","Please enter a password to use for the wallet":"Kies een wachtwoord voor deze rekening","Repair":"Repareren","Send BCB":"BCB versturen","Start sending BCB":"Begin met het versturen van BCB","To get started, you need BCB. Share your account to receive BCB.":"Je hebt momenteel geen BCB op je rekeningen staan. Maak eerst BCB over voordat je het kan verzenden.","To get started, you need an Account in your wallet to receive BCB.":"Om aan de slag te gaan heb je een rekening nodig om BCB te ontvangen.","Type below to see if an alias is free to use.":"Typ hieronder om te controleren of de alias nog beschikbaar is.","Use Server Side PoW":"Gebruik Server Side PoW","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"We zijn op zoek naar vertalers! Help Canoe in je taal beschikbaar te maken door lid te worden van de POEditor community.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"U kunt bijdragen doen door u aan te melden bij het vertaalproject van de POEditor community. We horen graag van je!","You can scan BCB addresses, payment requests and more.":"Scan BCB adressen, betalingsverzoeken en meer.","Your Bitcoin Black Betanet Wallet is ready!":"Jouw Bitcoin Black Betanet Wallet is gereed!","Your BCB wallet seed is backed up!":"Jouw Bitcoin Black Betanet Wallet seed is geback-upt!","Account":"Rekening","An account already exists with that name":"Er bestaat al een rekening met die naam","Confirm your PIN":"Bevestig je PIN","Enter a descriptive name":"Kies een omschrijvende naam","Failed to generate seed QR code":"QR-code seed kon niet worden gegenereerd","Incorrect PIN, try again.":"PIN onjuist, probeer opnieuw.","Incorrect code format for a seed:":"Onjuiste seed:","Information":"Informatie","Not a seed QR code:":"Geen QR-code van een seed:","Please enter your PIN":"Voer PIN in","Scan this QR code to import seed into another application":"Scan deze QR-code om de seed te importeren in een andere app","Security Preferences":"Beveiligingsvoorkeuren","Your current password":"Je huidige wachtwoord","Your password has been changed":"Je wachtwoord is veranderd","Canoe stores your BCB using cutting-edge security.":"Canoe slaat jouw BCB op met behulp van eersteklas beveiliging","Caution":"Waarschuwing","Decrypting wallet...":"Wallet ontcijferen...","Error after loading wallet:":"Error na het laden van de Wallet:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Ik begrijp dat wanneer deze app wordt verwijderd, mijn wallet alleen hersteld kan worden met de seed of een wallet-bestand back-up.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Door een wallet te importeren, worden je huidige wallet en al zijn rekeningen verwijderd. Mogelijk wil je eerst een back-up maken van je huidige seed of een bestandsback-up maken van de wallet.","Incorrect code format for an account:":"Onjuiste code-indeling voor een rekening:","Just scan and pay.":"Simpelweg scannen en betalen.","Manage":"Beheer","BCB is Feeless":"BCB kent geen Transactiekosten","BCB is Instant":"BCB is Snel","BCB is Secure":"BCB is Veilig","Never pay transfer fees again!":"Betaal nooit meer transactiekosten!","Support":"Ondersteuning","Trade BCB for other currencies like USD or Euros.":"Verwissel BCB kosteloos voor andere valuta als Euro of Dollar.","Transfer BCB instantly to anyone, anywhere.":"Maak BCB over in een oogwenk, aan iedereen, overal ter wereld","Account Representative":"Rekening Vertegenwoordiger","Add to address book?":"Toevoegen aan adresboek?","Alias Found!":"Alias Gevonden!","At least 3 Characters.":"Ten minste 3 Karakters.","Checking availablity":"Controleer beschikbaarheid","Create Alias":"Alias maken","Creating Alias...":"Alias aanmaken...","Do you want to add this new address to your address book?":"Wilt u dit nieuwe adres toevoegen aan uw adresboek?","Edit your alias.":"Wijzig uw alias.","Editing Alias...":"Alias wijzigen...","Email for recovering your alias":"E-mailadres voor herstellen alias","Enter a representative account.":"Voer een vertegenwoordiger in.","Error importing wallet:":"Error bij het importeren van wallet:","How to buy BCB":"Hoe BCB te kopen","How to buy and sell BCB is described at the website.":"Hoe BCB te kopen en verkopen is beschreven op de website.","Invalid Alias!":"Alias ongeldig!","Invalid Email!":"E-mail ongeldig!","Let People Easily Find you With Aliases":"Laat anderen u makkelijk vinden met aliassen","Link my wallet to my phone number.":"Link mijn wallet aan mijn telefoonnummer","Looking up @{{addressbookEntry.alias}}":"Opzoeken @{{addressbookEntry.alias}}","Make my alias private.":"Maak mijn alias privé.","Refund":"Terugbetaling","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Het repareren van jouw Wallet kan enige tijd in beslag nemen. Alle rekeningen gekoppeld aan je wallet worden opnieuw ingeladen. Weet je zeker dat je wil repareren?","Representative":"Vertegenwoordiger","Representative changed":"Vertegenwoordiger veranderd","That alias is taken!":"Alias is bezet!","The official English Terms of Service are available on the Canoe website.":"De officiële Engelse gebruiksvoorwaarden zijn beschikbaar op de website van Canoe","Valid Alias & Email":"Geldige Alias & E-mail","View Block on BCB Block Explorer":"Bekijk block op BCB Block Explorer","View on BCB Block Explorer":"Bekijk op BCB Block Explorer","What alias would you like to reserve?":"Welke alias wilt u reserveren?","You can change your alias, email, or privacy settings.":"U kunt uw alias, e-mail of privacy instellingen aanpassen.","Your old password was not entered correctly":"Uw oude wachtwoord is verkeerd ingeboerd","joe.doe@example.com":"jan.visser@voorbeeld.nl","joedoe":"joedoe","Wallet is Locked":"Canoe is vergrendeld","Forgot Password?":"Wachtwoord vergeten?","4-digit PIN":"4-cijferige PIN","Anyone with your seed can access or spend your BCB.":"Iedereen met uw seed heeft toegang tot uw BCB en kan het uitgeven.","Background Behaviour":"Achtergrond Gedrag","Change 4-digit PIN":"Wijzig 4-cijferige PIN","Change Lock Settings":"Wijzig vergrendeling instellingen","Fingerprint":"Vingerafdruk","Go back to onboarding.":"Ga terug naar opstartwizard.","Hard Lock":"Harde vergrendeling","Hard Timeout":"Harde time-out","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Indien ingeschakeld, wordt Proof Of Work gedelegeerd naar de Canoe servers. Op Canoe mobiel is deze optie voorlopig niet uit te zetten.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Indien ingeschakeld, wordt er een lijst met recente transacties van alle wallets getoond op het Home scherm. Momenteel uitgeschakeld vanwege onvolledige implementatie.","Lock when going to background":"Vergrendel waneer naar achtergrond verplaatst.","None":"Geen enkele","Password":"Wachtwoord","Saved":"Opgeslagen","Soft Lock":"Zachte vergrendeling","Soft Lock Type":"Zachte vergrendelingstype","Soft Timeout":"Zachte time-out","Timeout in seconds":"Time-out in seconden","Unrecognized data":"Niet herkende data","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Harde vergrendeling</h5>\nMet een harde vergrendeling wordt je wallet versleuteld en uit het geheugen gehaald. Harde vergrendeling kan nooit worden uitgeschakeld, maar wel op een hoge time-out gezet worden.","A new version of this app is available. Please update to the latest version.":"Een nieuwe versie van Canoe is beschikbaar. Update naar de laatste versie.","Backend URL":"Server url","Change Backend":"Verander server","Change Backend Server":"Verander van server","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Bij het importeren van een nieuwe wallet wordt de huidige wallet overschreven. Zorg ervoor dat je een back-up hebt gemaakt van je huidige wallet om verlies van BCB te voorkomen. Typ 'verwijderen' om je huidige wallet te verwijderen.","Max":"Maximaal","delete":"verwijderen","bitcoin.black":"bitcoin.black"});
    gettextCatalog.setStrings('pl', {"A member of the team will review your feedback as soon as possible.":"Członek zespołu zweryfikuje twoją opinię tak szybko, jak to możliwe.","About":"O programie","Account Information":"Informacje o Koncie","Account Settings":"Ustawienia Konta","Accounts":"Konta","Add Contact":"Dodaj kontakt","Add account":"Dodaj konto","Add as a contact":"Dodaj jako kontakt","Add description":"Dodaj opis","Address Book":"Książka adresowa","Advanced":"Zaawansowane","Advanced Settings":"Ustawienia zaawansowane","Allow Camera Access":"Zezwalaj na dostęp do kamery","Allow notifications":"Pozwól na otrzymywanie powiadomień","Almost done! Let's review.":"Prawie gotowe! Dokonajmy przeglądu.","Alternative Currency":"Alternatywna waluta","Amount":"Kwota","Are you being watched?":"Czy jesteś obserwowany?","Are you sure you want to delete this contact?":"Czy na pewno chcesz usunąć ten kontakt?","Are you sure you want to delete this wallet?":"Czy na pewno chcesz usunąć ten portfel?","Are you sure you want to skip it?":"Czy na pewno chcesz pominąć?","Backup Needed":"Potrzebna kopia zapasowa","Backup now":"Utwórz kopię zapasową teraz","Backup wallet":"Kopia zapasowa portfela","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Przechowuj swój seed w bezpiecznym miejscu. Jeśli ta aplikacja zostanie usunięta, lub jeśli to urządzenie zostanie skradzione, seed jest jedynym sposobem na odzyskanie portfela.","Browser unsupported":"Przeglądarka nieobsługiwana","But do not lose your seed!":"Ale nie zgub swojego seedu!","Buy &amp; Sell Bitcoin":"Kup &amp; sprzedaj bitcoiny","Cancel":"Anuluj","Cannot Create Wallet":"Nie można utworzyć portfela","Choose a backup file from your computer":"Wybierz plik kopii zapasowej z komputera","Click to send":"Kliknij, aby wysłać","Close":"Zamknij","Coin":"Moneta","Color":"Kolor","Commit hash":"Zatwierdzony hash","Confirm":"Potwierdź","Confirm &amp; Finish":"Potwierdź &amp; zakończenie","Contacts":"Kontakty","Continue":"Dalej","Contribute Translations":"Wkład do tłumaczenia","Copied to clipboard":"Skopiowano do schowka","Copy this text as it is to a safe place (notepad or email)":"Skopiuj ten tekst w bezpiecznym miejscu (notatnik lub e-mail)","Copy to clipboard":"Skopiuj do schowka","Could not access the wallet at the server. Please check:":"Nie można uzyskać dostępu do portfela na serwerze. Proszę sprawdzić:","Create Account":"Stwórz Konto","Create new account":"Stwórz nowe konto","Creating Wallet...":"Tworzenie portfela...","Creating account...":"Tworzenie konta...","Creating transaction":"Tworzenie transakcji","Date":"Data","Default Account":"Konto Domyślne","Delete":"Usuń","Delete Account":"Usuń Konto","Delete Wallet":"Usuń portfel","Deleting Wallet...":"Usuwanie portfela...","Do it later":"Zrób to później","Download":"Pobierz","Edit":"Edytuj","Email":"E-mail","Email Address":"Adres e-mail","Enable camera access in your device settings to get started.":"Udostępnij kamerę w ustawieniach urządzenia, aby rozpocząć pracę.","Enable email notifications":"Włącz powiadomienia e-mail","Enable push notifications":"Włącz powiadomienia","Enable the camera to get started.":"Włącz kamerę aby rozpocząć.","Enter amount":"Wprowadź kwotę","Enter wallet seed":"Podaj seed portfelu","Enter your password":"Wprowadź hasło","Error":"Błąd","Error at confirm":"Błąd w potwierdzeniu","Error scanning funds:":"Błąd skanowania środków:","Error sweeping wallet:":"Błąd opróżniania portfela:","Export wallet":"Eksportuj portfel","Extracting Wallet information...":"Wyodrębnianie danych z portfela...","Failed to export":"Nie udało się wyeksportować","Family vacation funds":"Środki na rodzinne wakacje","Feedback could not be submitted. Please try again later.":"Twój komentarz nie może zostać wysłany. Spróbuj ponownie później.","File/Text":"Plik/Tekst","Filter setting":"Ustawienie filtra","Finger Scan Failed":"Skanowanie odcisku nie powiodło się","Finish":"Zakończ","From":"Z","Funds found:":"Znaleziono środki:","Funds transferred":"Środki przelewane","Funds will be transferred to":"Środki będą przekazane do","Get started":{"button":"Pierwsze kroki"},"Get started by adding your first one.":"Zacznij dodając swój pierwszy kontakt.","Go Back":"Powrót","Go back":"Powrót","Got it":"Rozumiem","Help & Support":"Centrum pomocy","Help and support information is available at the website.":"Informacja o pomocy i wsparciu technicznym jest dostępna na stronie internetowej.","Hide Balance":"Ukryj środki","Home":"Strona główna","How could we improve your experience?":"Co moglibyśmy jeszcze według Ciebie poprawić?","I don't like it":"Nie podoba mi się","I have read, understood, and agree with the Terms of use.":"Przeczytałem, zrozumiałem i zgadzam się z Warunkami użytkowania.","I like the app":"Lubię aplikację","I think this app is terrible.":"Myślę, że ta aplikacja jest straszna.","I understand":"Rozumiem","I understand that my funds are held securely on this device, not by a company.":"Rozumiem, że moje środki są bezpieczne na tym urządzeniu i nie znajdują się w posiadaniu spółki.","I've written it down":"Zapisałem to","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Jeśli to urządzenie zostanie wymienione lub ta aplikacja usunięta, twoich funduszy nie będzie można odzyskać bez kopii zapasowej.\n","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Jeśli masz dodatkowe uwagi, prosimy o poinformowanie nas poprzez naciśnięcie przycisku \"Wyślij zgłoszenie\" w zakładce Ustawienia.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Jeśli zrobisz zrzut ekranu, twoja kopia zapasowa może być widziana przez inne aplikacje. Najbezpieczniejsza metoda utworzenia kopii zapasowej to długopis i papier.","Import Wallet":"Importuj portfel","Import seed":"Zaimportuj seed","Import wallet":"Importuj portfel","Importing Wallet...":"Importowanie portfela...","In order to verify your wallet backup, please type your password.":"W celu weryfikacji kopii zapasowej portfela wpisz swoje hasło.","Incomplete":"Nie wszyscy współwłaściciele dołączyli","Insufficient funds":"Nie ma wystarczającej ilości środków","Invalid":"Nieprawidłowy","Is there anything we could do better?":"Czy jest coś, co możemy poprawić?","Language":"Język","Learn more":"Dowiedz się więcej","Loading transaction info...":"Ładowanie informacji o transakcji...","Log options":"Opcje dziennika","Makes sense":"Brzmi sensownie","Matches:":"Dopasowania:","Meh - it's alright":"Spoko - może być","Memo":"Notatka","More Options":"Więcej opcji","Name":"Nazwa","New account":"Nowe konto","No Account available":"Brak dostępnego Konta","No contacts yet":"Brak kontaktów","No entries for this log level":"Brak wpisów dla tego poziomu dziennika","No recent transactions":"Brak wcześniejszych transakcji","No transactions yet":"Brak transakcji","No wallet found":"Nie znaleziono portfela","No wallet selected":"Nie wybrano portfela","No wallets available to receive funds":"Brak portfeli do otrzymania środków","Not funds found":"Nie znaleziono środków","Not now":"Nie teraz","Note":"Notatka","Notifications":"Powiadomienia","Notify me when transactions are confirmed":"Powiadom mnie, gdy transakcja zostanie potwierdzona","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Najwyższy czas na wykonanie kopii zapasowej portfela. Jeśli utracisz to urządzenie, dostęp do środków bez kopii zapasowej będzie niemożliwy.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Nadszedł czas, aby sprawdzić swoje otoczenie. Czy jesteś w pobliżu okna? Czy są gdzieś ukryte kamery? Osoby zerkające przez ramię?","Numbers and letters like 904A2CE76...":"Litery i cyfry, takie jak 904A2CE76","OK":"OK","OKAY":"W PORZĄDKU","Official English Disclaimer":"Oficjalna rezygnacja w języku angielskim","Oh no!":"O nie!","Open":"Otwórz","Open GitHub":"Otwórz GitHub","Open GitHub Project":"Otwórz projekt GitHub","Open Settings":"Otwórz ustawienia","Open Website":"Otwórz stronę internetową","Open website":"Otwórz stronę","Payment Accepted":"Wypłata zaakceptowana","Payment Proposal Created":"Wniosek wypłaty utworzony","Payment Received":"Płatność otrzymana","Payment Rejected":"Wypłata odrzucona","Payment Sent":"Płatność wysłana","Permanently delete this wallet.":"Trwale usuń portfel.","Please connect a camera to get started.":"Proszę podłączyć kamerę, aby zacząć.","Please, select your backup file":"Proszę wybrać plik kopii zapasowej","Preferences":"Ustawienia","Preparing addresses...":"Przygotowywanie adresów...","Preparing backup...":"Przygotowywanie kopii zapasowej...","Press again to exit":"Naciśnij ponownie, aby wyjść","Private Key":"Klucz prywatny","Private key encrypted. Enter password":"Klucz prywatny jest zaszyfrowany. Wprowadź hasło","Push Notifications":"Wyskakujące powiadomienia","QR Code":"Kod QR","Quick review!":"Szybki przegląd!","Rate on the app store":"Oceń w App Store","Receive":"Otrzymaj","Received":"Otrzymane","Recent":"Ostatnie","Recent Transaction Card":"Ostatnia transakcja kartą","Recent Transactions":"Ostatnie transakcje","Recipient":"Odbiorca","Release information":"Informacje o wersji","Remove":"Usuń","Restore from backup":"Przywróć z kopii zapasowej","Retry":"Spróbuj ponownie","Retry Camera":"Spróbuj ponownie z aparatem","Save":"Zapisz","Scan":"Zeskanuj","Scan QR Codes":"Zeskanuj kod QR","Scan again":"Skanuj ponownie","Scan your fingerprint please":"Proszę zeskanować linie papilarne","Scanning Wallet funds...":"Skanowanie środków portfela...","Screenshots are not secure":"Zrzuty ekranu nie są bezpieczne","Search Transactions":"Szukaj transakcji","Search transactions":"Szukaj transakcji","Search your currency":"Znajdź swoją walutę","Select a backup file":"Wybierz plik kopii zapasowej","Select an account":"Wybierz konto","Send":"Wyślij","Send Feedback":"Wyślij opinię","Send by email":"Wyślij przez e-mail","Send from":"Wyślij z","Send max amount":"Wyślij całą kwotę","Send us feedback instead":"Zamiast tego wyślij nam swoją opinię","Sending":"Wysyłanie","Sending feedback...":"Wysyłanie opinii...","Sending maximum amount":"Wysyłanie całej kwoty","Sending transaction":"Wysyłanie transakcji","Sent":"Wysłane","Services":"Usługi","Session Log":"Dziennik sesji","Session log":"Dziennik sesji","Settings":"Ustawienia","Share the love by inviting your friends.":"Podziel się miłością, zapraszając swoich przyjaciół.","Show more":"Pokaż więcej","Signing transaction":"Podpisywanie transakcji","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Jako że tylko ty kontrolujesz swoje pieniądze, będziesz musiał zapisać swój seed na wypadek usunięcia tej aplikacji.\n","Skip":"Pomiń","Slide to send":"Przesuń, aby wysłać","Sweep":"Opróżnij","Sweep paper wallet":"Wyczyść papierowy portfel","Sweeping Wallet...":"Sczytywanie portfela...","THIS ACTION CANNOT BE REVERSED":"TEJ CZYNNOŚCI NIE MOŻNA COFNĄĆ","Tap and hold to show":"Dotknij i przytrzymaj, aby pokazać","Terms Of Use":"Warunki użytkowania","Terms of Use":"Warunki użytkowania","Text":"Tekst","Thank you!":"Dziękujemy!","Thanks!":"Dzięki!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Bardzo nam miło. Chcielibyśmy dostać od Ciebie 5 gwiazdek - co jeszcze możemy poprawić?","The seed":"Seed","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Seed jest błędne, powinno zawierać 64 symbole: 0-9, A-F","The wallet server URL":"Link URL serwera portfelu","There is an error in the form":"Wystąpił błąd w postaci","There's obviously something we're doing wrong.":"To oczywiste, że coś robimy źle.","This app is fantastic!":"Ta aplikacja jest fantastyczna!","Timeline":"Historia","To":"Do","Touch ID Failed":"Odczyt Touch ID nie powiódł się","Transaction":"Transakcja","Transfer to":"Przekaż do","Try again in {{expires}}":"Spróbuj ponownie w {{expires}}","Uh oh...":"Ups...","Update Available":"Dostępna aktualizacja","Updating... Please stand by":"Aktualizacja... Proszę czekać","Verify your identity":"Weryfikacja konta użytkownika","Version":"Wersja","View":"Widok","View Terms of Service":"Zobacz zasady użytkowania","View Update":"Zobacz aktualizacje","Wallet Accounts":"Konta Portfelu","Wallet File":"Plik Portfelu","Wallet Seed":"Seed Portfelu","Warning!":"Ostrzeżenie!","Watch out!":"Uważaj!","We'd love to do better.":"Chcielibyśmy zrobić to lepiej.","Website":"Strona","Would you like to receive push notifications about payments?":"Czy chcesz otrzymywać wyskakujące powiadomienia o płatnościach?","Yes":"Tak","Yes, skip":"Tak, pomiń","You can create a backup later from your wallet settings.":"Kopię zapasową można utworzyć później w ustawieniach portfela.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Możesz zobaczyć postępy prac i przyczynić się do rozwoju tej aplikacji open source odwiedzając nasz projekt na GitHub.","You can still export it from Advanced &gt; Export.":"Nadal możesz go wyeksportować w Zaawansowane &gt; Eksport.","You'll receive email notifications about payments sent and received from your wallets.":"Będziesz otrzymywać powiadomienia e-mail o płatności wysyłanych i odbieranych ze swoich portfeli.","Your ideas, feedback, or comments":"Twoje pomysły, opinie lub komentarze","Your password":"Twoje hasło","Your wallet is never saved to cloud storage or standard device backups.":"Twój portfel nigdy nie jest przechowywany w chmurze lub na urządzeniach do tworzenia kopii zapasowych.","[Balance Hidden]":"[Balans ukryty]","How do you like Canoe?":"Jak Ci się podoba Canoe?","Let's Start":"Zacznijmy","New Password":"Nowe Hasło","Old Password":"Stare Hasło","One more time.":"Jeszcze raz.","Password too short":"Zbyt krótkie hasło","Passwords don't match":"Hasła się nie zgadzają","Passwords match":"Hasła zgadzają się","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Powiadomienia pusz dla Canoe są obecnie wyłączone. Włącz je w Ustawieniach aplikacji.","There is a new version of Canoe available":"Nowa wersja Canoe jest dostępna","We're always looking for ways to improve Canoe.":"Zawsze szukamy sposobów na ulepszenie Canoe.","Backup seed":"Kopia zapasowa seedu","Create Wallet":"Stwórz Portfel","Repair":"Napraw","Send BCB":"Wyślij BCB","Your Bitcoin Black Betanet Wallet is ready!":"Twój portfel do BCB jest gotowy!","Account":"Konto","An account already exists with that name":"Konto o tej nazwie już istnieje","Confirm your PIN":"Potwierdź swój PIN","Incorrect PIN, try again.":"Nieprawidłowy PIN, spróbuj ponownie.","Canoe stores your BCB using cutting-edge security.":"Canoe przechowuje twoje BCB używając najnowocześniejszych zabezpieczeń.","Decrypting wallet...":"Odszyfrowywanie portfela.","Error after loading wallet:":"Błąd po załadowaniu portfelu:","Just scan and pay.":"Zeskanuj i płać.","Manage":"Zarządzaj","Transfer BCB instantly to anyone, anywhere.":"Wysyłaj BCB natychmiastowo do kogokolwiek, gdziekolwiek.","At least 3 Characters.":"Przynajmniej 3 znaki.","How to buy BCB":"Jak kupić BCB","Invalid Email!":"Nieprawidłowy Email!","joe.doe@example.com":"jan.nowak@przykład.com","joedoe":"jannowak","Wallet is Locked":"Canoe jest Zablokowany","Forgot Password?":"Zapomniałeś Hasło?","4-digit PIN":"4-cyfrowy PIN","Change Lock Settings":"Zmień Ustawienia Blokady","Fingerprint":"Odcisk palca","Password":"Hasło","bitcoin.black":"bitcoin.black","Confirm Password":"Potwierdź Hasło"});
    gettextCatalog.setStrings('pt-br', {"A member of the team will review your feedback as soon as possible.":"Um membro do time irá revisar seu feedback assim que possível.","About":"Sobre","Account Information":"Informações da Conta","Account Name":"Nome da Conta","Account Settings":"Configurações","Account name":"Nome da conta","Accounts":"Contas","Add Contact":"Adicionar Contato","Add account":"Adicionar conta","Add as a contact":"Adicionar contato","Add description":"Adicionar descrição","Address Book":"Livro de Endereços","Advanced":"Avançado","Advanced Settings":"Configurações Avançadas","Allow Camera Access":"Permitir Acesso a Câmera","Allow notifications":"Permitir notificações","Almost done! Let's review.":"Quase terminando! Vamos revisar.","Alternative Currency":"Moeda Alternativa","Amount":"Quantidade","Are you being watched?":"Você está sendo vigiado?","Are you sure you want to delete this contact?":"Tem certeza que deseja deletar esse contato?","Are you sure you want to delete this wallet?":"Tem certeza que deseja deletar essa carteira?","Are you sure you want to skip it?":"Tem certeza que deseja pular isso?","Backup Needed":"Backup Necessário","Backup now":"Backup agora","Backup wallet":"Criar backup","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Tenha certeza que guardou sua seed num lugar seguro. Se este aplicativo for excluído, ou seu aparelho roubado, a seed é a unica forma de recuperar a carteira.","Browser unsupported":"Navegador não suportado","But do not lose your seed!":"Mas não perca sua seed.","Buy &amp; Sell Bitcoin":"Compre &amp; Venda Bitcoin","Cancel":"Cancelar","Cannot Create Wallet":"Não foi possível criar a carteira","Choose a backup file from your computer":"Escolha um arquivo de backup do seu computador","Click to send":"Clique para enviar","Close":"Fechar","Coin":"Moeda","Color":"Cor","Commit hash":"Commit Hash","Confirm":"Confirmar","Confirm &amp; Finish":"Confirmar e continuar","Contacts":"Contatos","Continue":"Continuar","Contribute Translations":"Contribuir para a tradução","Copied to clipboard":"Copiado","Copy this text as it is to a safe place (notepad or email)":"Copie este texto como está para um lugar seguro (bloco de notas ou e-mail)","Copy to clipboard":"Copiar","Could not access the wallet at the server. Please check:":"Não foi possível acessar a carteira no servidor. Por favor, verifique:","Create Account":"Criar Conta","Create new account":"Criar Nova Conta","Creating Wallet...":"Criando Carteira...","Creating account...":"Criando conta...","Creating transaction":"Criando transação","Date":"Data","Default Account":"Conta Padrão","Delete":"Deletar","Delete Account":"Deletar Conta","Delete Wallet":"Deletar Carteira","Deleting Wallet...":"Deletando Carteira...","Do it later":"Faça isto mais tarde","Donate to Bitcoin Black":"Doar para a Canoe","Download":"Download","Edit":"Editar","Email":"Email","Email Address":"Endereço de Email","Enable camera access in your device settings to get started.":"Permita o acesso de câmera nas configurações do seu dispositivo para começar.","Enable email notifications":"Ativar notificações por e-mail","Enable push notifications":"Ativar notificações push","Enable the camera to get started.":"Ative a câmera para começar.","Enter amount":"Digite a quantidade","Enter wallet seed":"Colocar seed da carteira","Enter your password":"Digite sua senha","Error":"Erro","Error at confirm":"Erro na confirmação","Error scanning funds:":"Erro escaneando fundos:","Error sweeping wallet:":"Erro na varredura da carteira:","Export wallet":"Exportar carteira","Extracting Wallet information...":"Extraindo informações da Carteira...","Failed to export":"Falha ao exportar","Family vacation funds":"Fundos de férias com a família","Feedback could not be submitted. Please try again later.":"Comentário pode não ter sido enviado. Por favor, tente novamente mais tarde.","File/Text":"Arquivo/Texto","Filter setting":"Configuração de filtro","Finger Scan Failed":"Leitura de Impressão Digital falhou","Finish":"Encerrar","From":"De","Funds found:":"Saldos encontrados:","Funds transferred":"Saldos transferidos","Funds will be transferred to":"Os saldos serão transferidos para","Get started":{"button":"Inicie agora"},"Get started by adding your first one.":"Comece adicionando o primeiro.","Go Back":"Voltar","Go back":"Voltar","Got it":"Entendi","Help & Support":"Ajuda & Suporte","Help and support information is available at the website.":"Ajuda e suporte","Hide Balance":"Informações de Ajuda e Suporte estão disponíveis no site.","Home":"Início","How could we improve your experience?":"Como poderíamos melhorar sua experiência?","I don't like it":"Eu não gosto","I have read, understood, and agree with the Terms of use.":"Li, entendi e concordo com os Termos de uso.","I like the app":"Eu gosto do app","I think this app is terrible.":"Acho que este aplicativo é terrível.","I understand":"Eu entendo","I understand that my funds are held securely on this device, not by a company.":"Eu entendi que meu saldo é mantido em segurança neste dispositivo e não por uma empresa.","I've written it down":"Já escrevi isso","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Se este dispositivo é substituído ou este aplicativo é excluído, seus fundos não podem ser recuperados sem um backup.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Se você tem sugestões adicionais, por favor, informe-nos através da opção \"Enviar Sugestões\" na Aba Configurações.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Se você fizer uma Captura de tela, seu backup poderá ser visto por outros aplicativos. Você pode fazer um backup físico com um papel e caneta.","Import Wallet":"Importar Carteira","Import seed":"Importar seed","Import wallet":"Importar carteira","Importing Wallet...":"Importando Carteira...","In order to verify your wallet backup, please type your password.":"Para verificar o seu backup de carteira, por favor, digite sua senha.","Incomplete":"Incompleto","Insufficient funds":"Fundos insuficientes","Invalid":"Invalido","Is there anything we could do better?":"Há algo mais que podemos ajudar?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"É importante que você escreva a seed da sua carteira corretamente. Se algo acontece a sua carteira, você irá precisar desta seed para recupera-la. Por favor, reveja sua seed e tente denovo.","Language":"Idioma","Learn more":"Saiba mais","Loading transaction info...":"Carregando informação da transação...","Log options":"Opções de log","Makes sense":"Certo","Matches:":"Correspondências:","Meh - it's alright":"Meh - está tudo bem","Memo":"Nota","More Options":"Mais opções","Name":"Nome","New account":"Nova conta","No Account available":"Não há contas disponiveis","No contacts yet":"Ainda não existem contatos","No entries for this log level":"Não há entradas para este nível de log","No recent transactions":"Sem transações recentes","No transactions yet":"Nenhuma transação pronta","No wallet found":"Nenhuma carteira encontrada","No wallet selected":"Sem carteira selecionada","No wallets available to receive funds":"Nenhuma Carteira disponível para receber fundos","Not funds found":"Nenhum fundo encontrado","Not now":"Agora não","Note":"Nota","Notifications":"Notificações","Notify me when transactions are confirmed":"Notificar-me quando as transações são confirmadas","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Agora é uma boa hora para fazer backup de sua carteira. Se este dispositivo for perdido, é impossível acessar seus fundos sem um backup.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Agora é a hora perfeita para olhar em volta. Próximo de janelas? Câmeras escondidas? Curiosos?","Numbers and letters like 904A2CE76...":"Números e letras como 904A2CE76...","OK":"OK","OKAY":"OK","Official English Disclaimer":"Aviso Legal Oficial em Inglês","Oh no!":"Oh não!","Open":"Abrir","Open GitHub":"Abrir GitHub","Open GitHub Project":"Abrir Projeto no GitHub","Open Settings":"Abrir definições","Open Website":"Abrir Site","Open website":"Abrir site","Paste the backup plain text":"Cole o backup no formato texto","Payment Accepted":"﻿Pagamento Aceito","Payment Proposal Created":"Proposta de Pagamento Criada","Payment Received":"Pagamento Recebido","Payment Rejected":"Pagamento Rejeitado","Payment Sent":"Pagamento Enviado","Permanently delete this wallet.":"Excluir permanentemente esta carteira.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Por favor, cuidadosamente escreva esta seed de 64 caracteres. Clique para copiar para área de transferência.","Please connect a camera to get started.":"Por favor conecte uma câmera para iniciar.","Please enter the seed":"Por favor insira a seed","Please, select your backup file":"Por favor, selecione seu arquivo de backup","Preferences":"Preferências","Preparing addresses...":"Preparando os endereços...","Preparing backup...":"Preparando o backup...","Press again to exit":"Pressione novamente para sair","Private Key":"Chave Privada","Private key encrypted. Enter password":"Chave privada criptografada. Digite a senha","Push Notifications":"Notificações","QR Code":"Código QR","Quick review!":"Avaliação rápida!","Rate on the app store":"Avalie-nos na App Store","Receive":"﻿Receber","Received":"Recebido","Recent":"Recente","Recent Transaction Card":"Transações recentes do cartão","Recent Transactions":"Transações recentes","Recipient":"Destinatário","Release information":"Informação de lançamento","Remove":"Remover","Restore from backup":"Restaurar backup","Retry":"Repetir","Retry Camera":"Tentar Camera novamente","Save":"Salvar","Scan":"Digitalizar","Scan QR Codes":"Digitalizar códigos QR","Scan again":"Escanear novamente","Scan your fingerprint please":"Escaneie sua impressão digital, por favor","Scanning Wallet funds...":"Pesquisando fundos de carteira…","Screenshots are not secure":"Capturas de Tela não são seguras","Search Transactions":"Procurar transações","Search or enter account number":"Procure ou insira número da conta","Search transactions":"Procurar transações","Search your currency":"Procure a sua moeda","Select a backup file":"Selecione um arquivo de backup","Select an account":"Selecione uma conta","Send":"Enviar","Send Feedback":"Enviar Sugestão","Send by email":"Enviar por E-mail","Send from":"Enviar De","Send max amount":"Quantidade Máxima de envio","Send us feedback instead":"Em vez disso, Envie-nos comentários","Sending":"Enviando","Sending feedback...":"Enviando sugestão...","Sending maximum amount":"Quantidade máxima de envio","Sending transaction":"Enviando transação","Sending {{amountStr}} from your {{name}} account":"Enviando {{amountStr}} da sua conta {{name}}","Sent":"Enviado","Services":"Serviços","Session Log":"Log da sessão","Session log":"Log da sessão","Settings":"Configurações","Share the love by inviting your friends.":"Compartilhe o amor convidando seus amigos.","Show Account":"Mostrar conta","Show more":"Mostrar mais","Signing transaction":"Assinando Transação","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Já que só você controla seu dinheiro, você precisará salvar a seed da sua carteira caso este aplicativo seja excluído.","Skip":"Pular","Slide to send":"Deslize para enviar","Sweep":"Limpar","Sweep paper wallet":"Varrer a carteira de papel","Sweeping Wallet...":"Carteira de varredura...","THIS ACTION CANNOT BE REVERSED":"ESTA AÇÃO NÃO PODE SER REVERTIDA","Tap and hold to show":"Toque e mantenha para mostrar","Terms Of Use":"Termos de uso","Terms of Use":"Termos de uso","Text":"Texto","Thank you!":"Obrigado!","Thanks!":"Obrigado!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Isso é emocionante de ouvir. Gostaríamos de ganhar essa quinta estrela de você - como poderíamos melhorar sua experiência?","The seed":"A seed","The seed is invalid, it should be 64 characters of: 0-9, A-F":"A seed é invalida, deveria ser 64 caracteres de: 0-9, A-F","The wallet server URL":"O URL do server da carteira","There is an error in the form":"Existe um erro no formulário","There's obviously something we're doing wrong.":"Obviamente há algo que estamos fazendo de errado.","This app is fantastic!":"Esta aplicação é fantástica!","Timeline":"Cronograma","To":"Para","Touch ID Failed":"Falha no Touch ID","Transaction":"Transação","Transfer to":"Transferir para","Transfer to Account":"Transferir para conta","Try again in {{expires}}":"Tente novamente em {{expires}}","Uh oh...":"Uh oh...","Update Available":"Atualização Disponível","Updating... Please stand by":"Atualizando... Por favor, aguarde","Verify your identity":"Verifique a sua identidade","Version":"﻿Versão","View":"Ver","View Terms of Service":"Ver os Termos de Serviço","View Update":"Ver atualizações","Wallet Accounts":"Contas da carteira","Wallet File":"Arquivo da carteira","Wallet Seed":"Seed da carteira","Wallet seed not available":"Seed da carteira não está disponível ","Warning!":"Atenção!","Watch out!":"Cuidado!","We'd love to do better.":"Nós adoraríamos fazer melhor.","Website":"Página da Web","What do you call this account?":"Como você chama essa conta?","Would you like to receive push notifications about payments?":"Gostaria de receber notificações push sobre pagamentos?","Yes":"Sim","Yes, skip":"Sim, pule","You can change the name displayed on this device below.":"Você pode mudar o nome exibido neste dispositivo abaixo.","You can create a backup later from your wallet settings.":"Você poderá criar um backup de suas configurações de carteira mais tarde.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Você pode ver os mais recentes desenvolvimentos e contribuir para este aplicativo de código aberto, visitando nosso projeto no GitHub.","You can still export it from Advanced &gt; Export.":"Você ainda pode exportá-la em Avançado &gt; Exportar.","You'll receive email notifications about payments sent and received from your wallets.":"Você receberá notificações por e-mail sobre pagamentos enviados e recebidos de suas carteiras.","Your ideas, feedback, or comments":"Suas ideias, comentários ou observações","Your password":"Sua senha","Your wallet is never saved to cloud storage or standard device backups.":"Sua carteira não é salva na nuvem ou em qualquer tipo de backup automático.","[Balance Hidden]":"[Valores escondidos]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Eu li, compreendi, e aceito os <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\"> Termos de Uso</a>","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Classificação com 5 estrelas nos ajuda a espalhar Canoe para mais pessoas, mais e mais usuários significam mais recursos que podem ser implementados.","At least 8 Characters. Make it good!":"Pelo menos 8 caracteres. Você consegue mais do que isso!","Change Password":"Mude sua senha","Confirm New Password":"Confirme sua senha","How do you like Canoe?":"Você gosta da Canoe?","Let's Start":"Vamos começar","New Password":"Nova senha","Old Password":"Senha antiga","One more time.":"Mais uma vez.","Password too short":"Senha muito curta","Passwords don't match":"As senhas não conferem","Passwords match":"As senhas conferem","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Notificações via push para Canoa estão atualmente desabilitadas. Ative-as em configurações do aplicativo.","Share Canoe":"Compartilhe Canoe","There is a new version of Canoe available":"Existe uma nova versão do Canoe disponível","We're always looking for ways to improve Canoe.":"Nós estamos sempre procurando um modo de melhorar Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Nós estamos sempre procurando um modo de melhorar Canoe. Como poderiamos melhorar sua experiência?","Would you be willing to rate Canoe in the app store?":"Você estaria disposto a classificar Canoe na App Store?","Account Alias":"Apelido da sua Conta","Account Color":"Cor da Conta","Alias":"Apelido","Backup seed":"Sua seed para Backup","Create Wallet":"Criar minha carteira","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Não consegue achar sua lingua? Se inscreva no POEditor! Nós amaríamos adicionar sua lingua.","Edit Contact":"Mudar contato","Enter password":"Digite a senha","Incorrect password, try again.":"Senha incorreta, tente novamente.","Joe Doe":"Joe Doe","Join the future of money,<br>get started with BCB.":"Conheça o futuro do dinheiro,<br>comece a usar BCB.","Lock wallet":"Bloquear Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB é diferente &ndash; ela não pode ser guardada em um banco ou em um serviço de internet.","No accounts available":"Sem contas disponíveis","No backup, no BCB.":"Sem backup, sem BCB.","Open POEditor":"Abrir POEditor","Open Translation Site":"Abrir site de tradução","Password to decrypt":"Senha para descriptografar","Password to encrypt":"Senha para criptografar","Please enter a password to use for the wallet":"Por favor digite uma senha para usar a carteira","Repair":"Reparar","Send BCB":"Enviar BCB","Start sending BCB":"Começe enviando BCB","To get started, you need BCB. Share your account to receive BCB.":"Para começar, você precisa de BCB. Compartilhe sua conta para receber BCB.","To get started, you need an Account in your wallet to receive BCB.":"Para começar, você precisa de uma Conta na sua carteira para receber BCB.","Type below to see if an alias is free to use.":"Digite abaixo para ver se o apelido está disponível.","Use Server Side PoW":"Usar o servidor PoW","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Nós estamos sempre procurando por tradutores! Você pode fazer correções ou ajudar a fazer este aplicativo disponível na sua língua nativa se juntando na nossa comunidade no POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Você pode fazer contribuições se inscrevendo na nossa comunidade de tradução POEditor. Nós estamos procurando a fundo saber isso de você!","You can scan BCB addresses, payment requests and more.":"Você pode analisar seu endereço BCB, pedidos de pagamentos e entre outros.","Your Bitcoin Black Betanet Wallet is ready!":"Sua carteira BCB está pronta!","Your BCB wallet seed is backed up!":"Sua seed foi salva!","Account":"Conta","An account already exists with that name":"Uma conta com este nome já existe","Confirm your PIN":"Confirme seu PIN","Enter a descriptive name":"Insira um nome descritivo","Failed to generate seed QR code":"Falha ao gerar o código QR","Incorrect PIN, try again.":"PIN incorreto, tente novamente.","Incorrect code format for a seed:":"Formato de código incorreto para uma seed.","Information":"Informação","Not a seed QR code:":"Não é um código QR","Please enter your PIN":"Por favor insira seu PIN","Scan this QR code to import seed into another application":"Escaneie este código QR para importar a seed dentro de outra aplicação.","Security Preferences":"Preferências de segurança","Your current password":"Sua senha atual","Your password has been changed":"Sua senha foi mudada","Canoe stores your BCB using cutting-edge security.":"Canoe guarda suas Nanos usando segurança de primeira.","Caution":"Cuidado","Decrypting wallet...":"Descriptografando carteira...","Error after loading wallet:":"Erro após carregar a carteira","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Eu entendo que se o aplicativo for deletado, minha carteira só pode ser recuperada com a seed ou um arquivo de backup.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Importar uma carteira remove sua carteira atual e suas contas. Você pode querer fazer o backup de sua seed atual ou fazer um arquivo de backup da sua carteira.","Incorrect code format for an account:":"Formato de código incorreto para uma conta:","Just scan and pay.":"Somente scaneie e pague.","Manage":"Administrar","BCB is Feeless":"BCB não tem taxa","BCB is Instant":"BCB é instantânea","BCB is Secure":"BCB é segura","Never pay transfer fees again!":"Nunca pague taxas novamente!","Support":"Suporte","Trade BCB for other currencies like USD or Euros.":"Troque BCB por outras moedas como USD ou Euros.","Transfer BCB instantly to anyone, anywhere.":"Envie BCB para qualquer pessoa, em qualquer lugar, imediatamente.","Account Representative":"Conta do representante","Add to address book?":"Adicionar à lista de endereços?","Alias Found!":"Alias encontrado!","At least 3 Characters.":"Pelo menos 3 caracteres.","Checking availablity":"Verificando diponibilidade","Create Alias":"Criar Alias","Creating Alias...":"Criando Alias...","Do you want to add this new address to your address book?":"Quer adicionar este novo endereço à sua lista de endereços?","Edit your alias.":"Editar o seu Alias.","Editing Alias...":"Editando Alias...","Email for recovering your alias":"Recuperar o seu Alias por Email","Enter a representative account.":"Insere a conta de um representante.","Error importing wallet:":"Erro ao importar carteira:","How to buy BCB":"Como comprar BCB","How to buy and sell BCB is described at the website.":"Como comprar e vender BCB","Invalid Alias!":"Alias inválido!","Invalid Email!":"Email inválido!","Let People Easily Find you With Aliases":"Permitir pessoas encontrarem-no  facilmente com o seu Alias","Link my wallet to my phone number.":"Ligar a minha carteira com o meu número de telemóvel.","Looking up @{{addressbookEntry.alias}}":"Procurar por @{{addressbookEntry.alias}}","Make my alias private.":"Tornar o meu Alias privado.","Refund":"Reembolso","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Reparar a sua carteira pode demorar algum tempo. Isto vai recarregar todas as blockchains associadas à sua carteira. Tem a certeza que quer reparar?","Representative":"Representante","Representative changed":"Representante mudado","That alias is taken!":"Esse alias já foi escolhido.","The official English Terms of Service are available on the Canoe website.":"Os Termos de Serviço oficiais (em Inglês) estão disponíveis no site da Canoe.","Valid Alias & Email":"Email e Alias válidos","View Block on BCB Block Explorer":"Ver bloco no BCB Block Explorer","View on BCB Block Explorer":"Ver no BCB Block Explorer","What alias would you like to reserve?":"Qual alias você gostaria de reservar?","You can change your alias, email, or privacy settings.":"Você pode modificar seu alias, email e configurações de privacidade.","Your old password was not entered correctly":"Sua senha antiga está incorreta","joe.doe@example.com":"joao@exemplo.com","joedoe":"joao","Wallet is Locked":"Canoe está bloqueada","Forgot Password?":"Perdeu a senha?","4-digit PIN":"Pin de 4 Dígitos","Anyone with your seed can access or spend your BCB.":"Qualquer um com sua seed pode acessar ou gastar suas Nanos.","Background Behaviour":"Comportamento de Fundo","Change 4-digit PIN":"Mudar PIN de 4 Dígitos","Change Lock Settings":"Mudar configurações de bloqueio","Fingerprint":"Biometria","Go back to onboarding.":"Voltar","Hard Lock":"Bloqueio Hard","Hard Timeout":"Hard Timeout","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Se ativo, PoW será feito no servidor da Canoe. Essa opção está desativada e sempre ativa na Canoe mobile por enquanto.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Se ativado, uma lista de transações recentes de todas as carteiras serão exibidas na guia Início. Atualmente falso, não totalmente implementado.","Lock when going to background":"Bloquear quando for para segundo plano","None":"Nenhum","Password":"Senha","Saved":"Salvo","Soft Lock":"Bloqueio Soft","Soft Lock Type":"Tipo de Bloqueio Soft","Soft Timeout":"Soft Timeout","Timeout in seconds":"Timeout em segundos","Unrecognized data":"Dados não reconhecidos","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          Com o Hard Lock, a Canoe criptografa sua carteira e a remove completamente da memória. Você não pode desativar o Hard Lock, mas você pode definir um tempo limite muito alto.","A new version of this app is available. Please update to the latest version.":"Uma nova versão do app está disponível. Por favor atualize para a última versão.","Backend URL":"URL do Backend","Change Backend":"Mudar Backend","Change Backend Server":"Mudar servidor de Backend","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Importar uma carteira removerá sua carteira e contas existentes! Se você tiver fundos em sua carteira atual, verifique se tem um backup para restaurar. Digite \"deletar\" para confirmar que você deseja excluir sua carteira atual.","Max":"Max","delete":"deletar","bitcoin.black":"bitcoin.black","Confirm Password":"Confirmar Senha","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Voltar para a integração removerá sua carteira e suas contas existentes! Se você tiver fundos em sua carteira atual, verifique se tem um backup para restaurar. Digite \"deletar\" para confirmar que você deseja excluir sua carteira atual.","Please enter a password of at least 8 characters":"Por favor coloque uma senha de no mínimo 8 caracteres","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"Nessa tela você pode ver todas suas contas. Veja nossos <a ng-click=\"openExternalLinkHelp()\">FAQs</a> antes de iniciar!","Play Sounds":"Reproduzir Sons","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Escolha o tipo de bloqueio a ser usado quando Canoe for para o segundo plano. Para desativar o bloqueio em segundo plano, selecione Nenhum.</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":" <h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">Com o Soft Lock, o Canoe está bloqueada, mas sua carteira ainda não está criptografada na memória. Ao ativar o Soft Locks, é possível usar formas mais simples de credenciais, como PINs e impressões digitais.</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Escolha o tipo de bloqueio a ser usado quando Canoe for para o segundo plano. Para desativar o bloqueio em segundo plano, selecione Nenhum.","Encryption Time!":"Hora de Criptografar!","Enter at least 8 characters to encrypt your wallet.":"Digite pelo menos 8 caracteres para criptografar sua carteira.","Password length ok":"Tamanho da senha ok","Passwords do not match":"Senhas não conferem.","Unlock":"Desbloquear.","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Com o Soft Lock, o Canoe está bloqueada, mas sua carteira ainda não está criptografada na memória. Ao ativar o Soft Locks, é possível usar formas mais simples de credenciais, como PINs e impressões digitais."});
    gettextCatalog.setStrings('pt', {"A member of the team will review your feedback as soon as possible.":"Um membro da equipe irá rever a sua avaliação assim que possível.","About":"Sobre","Account Information":"Informações da conta","Account Name":"Nome da conta","Account Settings":"Configurações da conta","Account name":"Nome da conta","Accounts":"Contas","Add Contact":"Adicionar contato","Add account":"Adicionar conta","Add as a contact":"Adicionar como um contato","Add description":"Adicionar descrição","Address Book":"Livros de endereços","Advanced":"Avançado","Advanced Settings":"Definições avançadas","Allow Camera Access":"Permitir o acesso à câmera","Allow notifications":"Permitir notificações","Almost done! Let's review.":"Quase pronto! Vamos rever.","Alternative Currency":"Moeda Alternativa","Amount":"﻿Valor","Are you being watched?":"Você está sendo vigiado?","Are you sure you want to delete this contact?":"Tem certeza que deseja excluir este contato?","Are you sure you want to delete this wallet?":"Tem certeza que deseja excluir esta carteira?","Are you sure you want to skip it?":"Tem a certeza que deseja ignorar?","Backup Needed":"Cópia de segurança necessária","Backup now":"Backup agora","Backup wallet":"Criar cópia da carteira","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Tenha certeza ao guardar sua semente num lugar seguro. Se este aplicativo é excluído, ou seu aparelho roubado, a semente é a unica forma de recuperar a carteira.","Browser unsupported":"Navegador não suportado","But do not lose your seed!":"Mas não perca sua semente!","Buy &amp; Sell Bitcoin":"Comprar &amp; Vender Bitcoin","Cancel":"Cancelar","Cannot Create Wallet":"Não é possível criar a carteira","Choose a backup file from your computer":"Escolha um arquivo de backup do seu computador","Click to send":"Clique para enviar","Close":"Fechar","Coin":"Moeda","Color":"Cor","Commit hash":"Commit de hash","Confirm":"Confirmar","Confirm &amp; Finish":"Confirmar &amp; Terminado","Contacts":"Contatos","Continue":"Continuar","Contribute Translations":"Contribuir para a tradução","Copied to clipboard":"Copiado para a área de transferência","Copy this text as it is to a safe place (notepad or email)":"Copie este texto como está para um lugar seguro (bloco de notas ou e-mail)","Copy to clipboard":"Copiar para área de transferência","Could not access the wallet at the server. Please check:":"Não foi possível acessar a carteira no servidor. Por favor, verifique:","Create Account":"Criar conta","Create new account":"Criar nova conta","Creating Wallet...":"Criando Carteira…","Creating account...":"Criando conta...","Creating transaction":"Criando transação","Date":"Data","Default Account":"Conta padrão","Delete":"Excluir","Delete Account":"Excluir conta","Delete Wallet":"Excluir Carteira","Deleting Wallet...":"Eliminando carteira...","Do it later":"Faça mais tarde","Donate to Bitcoin Black":"Doe para Canoe","Download":"Download","Edit":"Editar","Email":"Email","Email Address":"Endereço de e-mail","Enable camera access in your device settings to get started.":"Permita o acesso de câmera nas configurações do seu dispositivo para começar.","Enable email notifications":"Ativar notificações por e-mail","Enable push notifications":"Ativar notificações push","Enable the camera to get started.":"Ative a câmera para começar.","Enter amount":"Digite a quantidade","Enter wallet seed":"Insira a semente da carteira","Enter your password":"Digite sua senha","Error":"Erro","Error at confirm":"Erro na confirmação","Error scanning funds:":"Erro escaneando fundos:","Error sweeping wallet:":"Erro na varredura da carteira:","Export wallet":"Exportar carteira","Extracting Wallet information...":"Extraindo informações da Carteira...","Failed to export":"Falha ao exportar","Family vacation funds":"Fundos de férias com a família","Feedback could not be submitted. Please try again later.":"Comentário pode não ter sido enviado. Por favor, tente novamente mais tarde.","File/Text":"Arquivo/Texto","Filter setting":"Configuração de filtro","Finger Scan Failed":"Leitura de Impressão Digital falhou","Finish":"Encerrar","From":"De","Funds found:":"Saldos encontrados:","Funds transferred":"Saldos transferidos","Funds will be transferred to":"Os saldos serão transferidos para","Get started":{"button":"Começar"},"Get started by adding your first one.":"Comece adicionando o primeiro.","Go Back":"Retroceder","Go back":"Retroceder","Got it":"Compreendi","Help & Support":"Ajuda e suporte","Help and support information is available at the website.":"Informações de Ajuda e Suporte estão disponíveis no site.","Hide Balance":"Esconder saldos","Home":"Início","How could we improve your experience?":"Como poderíamos melhorar sua experiência?","I don't like it":"Eu não gosto","I have read, understood, and agree with the Terms of use.":"Eu li, entendi, e concordo com os Termos de uso.","I like the app":"Eu gosto do aplicativo","I think this app is terrible.":"Acho que este aplicativo é terrível.","I understand":"Eu compreendi","I understand that my funds are held securely on this device, not by a company.":"Eu entendi que meu saldo são mantidos em segurança neste dispositivo e não por uma empresa.","I've written it down":"Já escrevi isso","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Se este dispositivo é substituído ou este aplicativo é excluído, seus fundos não podem ser recuperados sem um backup.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Se você tem sugestões adicionais, por favor, informe-nos através da opção \"Enviar Sugestões\" na Aba Configurações.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Se você fizer uma Captura de tela, seu backup poderá ser visto por outros aplicativos. Você pode fazer um backup físico com um papel e caneta.","Import Wallet":"Importar carteira","Import seed":"Importar semente","Import wallet":"Importar carteira","Importing Wallet...":"Importando carteira...","In order to verify your wallet backup, please type your password.":"Para verificar o seu backup de carteira, por favor, digite sua senha.","Incomplete":"Incompleto","Insufficient funds":"Fundos insuficientes","Invalid":"Inválido","Is there anything we could do better?":"Há algo mais que podemos ajudar?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"É importante que você escreva a semente da sua carteira corretamente. Se algo acontece a sua carteira, você irá precisar desta semente para recupera-la. Por favor, reveja sua semente e tente denovo.","Language":"Idioma","Learn more":"Saiba mais","Loading transaction info...":"Carregando informação da transação...","Log options":"Opções de log","Makes sense":"Faz sentido","Matches:":"Correspondências:","Meh - it's alright":"Meh - está tudo bem","Memo":"Nota","More Options":"Mais opções","Name":"Nome","New account":"Nova conta","No Account available":"Não há contas disponiveis","No contacts yet":"Ainda não existem contactos","No entries for this log level":"Não há entradas para este nível de log","No recent transactions":"Não há transações recentes","No transactions yet":"Nenhuma transação ainda","No wallet found":"Carteira não encontrada","No wallet selected":"Sem carteira selecionada","No wallets available to receive funds":"Nenhuma Carteira disponível para receber fundos","Not funds found":"Nenhum fundo encontrado","Not now":"Agora não","Note":"Nota","Notifications":"Notificações","Notify me when transactions are confirmed":"Notificar-me quando as transações são confirmadas","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Agora é uma boa hora para fazer backup de sua carteira. Se este dispositivo for perdido, é impossível acessar seus fundos sem um backup.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Agora é a hora perfeita para olhar em volta. Próximo de janelas? Câmeras escondidas? Curiosos?","Numbers and letters like 904A2CE76...":"Números e letras como 904A2CE76...","OK":"OK","OKAY":"OK","Official English Disclaimer":"Aviso Legal Oficial em Inglês","Oh no!":"Oh não!","Open":"Abrir","Open GitHub":"Abrir GitHub","Open GitHub Project":"Abrir Projeto no GitHub","Open Settings":"Abrir definições","Open Website":"Abrir Site","Open website":"Abrir página da Web","Paste the backup plain text":"Cole o backup no formato texto","Payment Accepted":"﻿Pagamento Aceito","Payment Proposal Created":"Proposta de Pagamento Criada","Payment Received":"Pagamento Recebido","Payment Rejected":"Pagamento Rejeitado","Payment Sent":"Pagamento Enviado","Permanently delete this wallet.":"Excluir permanentemente esta carteira.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Por favor, cuidadosamente escreva esta semente de 64 caracteres. Clique para copiar para área de transferência.","Please connect a camera to get started.":"Por favor conecte uma câmera para iniciar.","Please enter the seed":"Por favor insira a semente","Please, select your backup file":"Por favor, selecione seu arquivo de backup","Preferences":"Preferências","Preparing addresses...":"Preparando os endereços...","Preparing backup...":"Preparando o backup...","Press again to exit":"Pressione novamente para sair","Private Key":"Chave Privada","Private key encrypted. Enter password":"Chave privada criptografada. Digite a senha","Push Notifications":"Notificações","QR Code":"Código QR","Quick review!":"Avaliação rápida!","Rate on the app store":"Avalie-nos na App Store","Receive":"﻿Receber","Received":"Recebido","Recent":"Recente","Recent Transaction Card":"Transações recentes do cartão","Recent Transactions":"Transações recentes","Recipient":"Destinatário","Release information":"Informação de lançamento","Remove":"Remover","Restore from backup":"Restaurar do backup","Retry":"Repetir","Retry Camera":"Tentar Camera novamente","Save":"Salvar","Scan":"Digitalizar","Scan QR Codes":"Digitalizar códigos QR","Scan again":"Escanear novamente","Scan your fingerprint please":"Escaneie sua impressão digital, por favor","Scanning Wallet funds...":"Pesquisando fundos de carteira…","Screenshots are not secure":"Capturas de Tela não são seguras","Search Transactions":"Procurar transações","Search or enter account number":"Procure ou insira número da conta","Search transactions":"Procurar transações","Search your currency":"Procure a sua moeda","Select a backup file":"Selecione um arquivo de backup","Select an account":"Selecione uma conta","Send":"Enviar","Send Feedback":"Enviar Sugestão","Send by email":"Enviar por E-mail","Send from":"Enviar De","Send max amount":"Quantidade Máxima de envio","Send us feedback instead":"Em vez disso, Envie-nos comentários","Sending":"Enviando","Sending feedback...":"Enviando sugestão...","Sending maximum amount":"Quantidade máxima de envio","Sending transaction":"Enviando transação","Sending {{amountStr}} from your {{name}} account":"Enviando {{amountStr}} da sua conta {{name}}","Sent":"Enviado","Services":"Serviços","Session Log":"Log da sessão","Session log":"Log da sessão","Settings":"Configurações","Share the love by inviting your friends.":"Compartilhe o amor convidando seus amigos.","Show Account":"Mostrar conta","Show more":"Mostrar mais","Signing transaction":"Assinando Transação","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Já que só você controla seu dinheiro, você precisará salvar a semente da sua carteira caso este aplicativo seja excluído.","Skip":"Pular","Slide to send":"Deslize para enviar","Sweep":"Limpar","Sweep paper wallet":"Varrer a carteira de papel","Sweeping Wallet...":"Carteira de varredura...","THIS ACTION CANNOT BE REVERSED":"ESTA AÇÃO NÃO PODE SER REVERTIDA","Tap and hold to show":"Toque e mantenha para mostrar","Terms Of Use":"Termos de uso","Terms of Use":"Termos de uso","Text":"Texto","Thank you!":"Obrigado!","Thanks!":"Obrigado!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Isso é emocionante de ouvir. Gostaríamos de ganhar essa quinta estrela de você - como poderíamos melhorar sua experiência?","The seed":"A seed","The seed is invalid, it should be 64 characters of: 0-9, A-F":"A semente é invalida, deveria ser 64 caracteres de: 0-9, A-F","The wallet server URL":"O URL do server da carteira","There is an error in the form":"Existe um erro no formulário","There's obviously something we're doing wrong.":"Obviamente há algo que estamos fazendo de errado.","This app is fantastic!":"Esta aplicação é fantástica!","Timeline":"Cronograma","To":"Para","Touch ID Failed":"Falha no Touch ID","Transaction":"Transação","Transfer to":"Transferir para","Transfer to Account":"Transferir para conta","Try again in {{expires}}":"Tente novamente em {{expires}}","Uh oh...":"Uh oh...","Update Available":"Atualização Disponível","Updating... Please stand by":"Atualizando... Por favor, aguarde","Verify your identity":"Verifique a sua identidade","Version":"﻿Versão","View":"Ver","View Terms of Service":"Ver os Termos de Serviço","View Update":"Ver atualizações","Wallet Accounts":"Contas da carteira","Wallet File":"Arquivo da carteira","Wallet Seed":"Semente da carteira","Wallet seed not available":"Semente da carteira não está disponível ","Warning!":"Atenção!","Watch out!":"Cuidado!","We'd love to do better.":"Nós adoraríamos fazer melhor.","Website":"Página da Web","What do you call this account?":"Como você chama essa conta?","Would you like to receive push notifications about payments?":"Gostaria de receber notificações push sobre pagamentos?","Yes":"Sim","Yes, skip":"Sim, pule","You can change the name displayed on this device below.":"Você pode mudar o nome exibido neste dispositivo abaixo.","You can create a backup later from your wallet settings.":"Você poderá criar um backup de suas configurações de carteira mais tarde.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Você pode ver os mais recentes desenvolvimentos e contribuir para este aplicativo de código aberto, visitando nosso projeto no GitHub.","You can still export it from Advanced &gt; Export.":"Você ainda pode exportá-la em Avançado &gt; Exportar.","You'll receive email notifications about payments sent and received from your wallets.":"Você receberá notificações por e-mail sobre pagamentos enviados e recebidos de suas carteiras.","Your ideas, feedback, or comments":"Suas ideias, comentários ou observações","Your password":"Sua senha","Your wallet is never saved to cloud storage or standard device backups.":"Sua carteira nunca foi salva num armazenamento em nuvem ou dispositivo padrão de backups.","[Balance Hidden]":"[Valores escondidos]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Eu li, compreendi, e aceito os <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\"> Termos de Uso</a>","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Classificação com 5 estrelas nos ajuda a espalhar Canoe para mais pessoas, mais e mais usuários significam mais recursos que podem ser implementados.","At least 8 Characters. Make it good!":"Pelo menos 8 caracteres. Você consegue mais do que isso!","Change Password":"Mude sua senha","Confirm New Password":"Confirme sua nova senha","How do you like Canoe?":"Você gosta da Canoe?","Let's Start":"Vamos começar","New Password":"Nova senha","Old Password":"Senha antiga","One more time.":"Mais uma vez.","Password too short":"Senha muito curta","Passwords don't match":"As senhas não conferem","Passwords match":"As senhas conferem","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Notificações via push para Canoa estão atualmente desabilitadas. Ative-as em configurações do aplicativo.","Share Canoe":"Compartilhe Canoe","There is a new version of Canoe available":"Existe uma nova versão do Canoe disponível","We're always looking for ways to improve Canoe.":"Nós estamos sempre procurando um modo de melhorar Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Nós estamos sempre procurando um modo de melhorar Canoe. Como poderiamos melhorar sua experiência?","Would you be willing to rate Canoe in the app store?":"Você estaria disposto a classificar Canoe na App Store?","Account Alias":"Apelido para Conta","Account Color":"Cor da Conta","Alias":"Apelido","Backup seed":"Sua seed para Backup","Create Wallet":"Criar uma carteira","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Não consegue achar sua lingua? Se inscreva no POEditor! Nós amaríamos adicionar sua lingua.","Edit Contact":"Mudar contato","Enter password":"Digite a senha","Incorrect password, try again.":"Senha incorreta, tente novamente.","Joe Doe":"Joe Doe","Join the future of money,<br>get started with BCB.":"Entre para o futuro do dinheiro,<br>conheça BCB.","Lock wallet":"Bloquear Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB é diferente &ndash; ela não pode ser guardada em um banco ou em um serviço de internet.","No accounts available":"Sem contas disponíveis","No backup, no BCB.":"Sem backup, sem BCB.","Open POEditor":"Abrir POEditor","Open Translation Site":"Abrir site de tradução","Password to decrypt":"Senha para descriptografar","Password to encrypt":"Senha para criptografar","Please enter a password to use for the wallet":"Por favor digite uma senha para usar a carteira","Repair":"Reparar","Send BCB":"Enviar BCB","Start sending BCB":"Começe enviando BCB","To get started, you need BCB. Share your account to receive BCB.":"Para começar, você precisa de BCB. Compartilhe sua conta para receber BCB.","To get started, you need an Account in your wallet to receive BCB.":"Para começar, você precisa de uma Conta na sua carteira para receber BCB.","Type below to see if an alias is free to use.":"Digite abaixo para ver se o apelido está disponível.","Use Server Side PoW":"Usar o servidor PoW","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Nós estamos sempre procurando por tradutores! Você pode fazer correções ou ajudar a fazer este aplicativo disponível na sua língua nativa se juntando na nossa comunidade no POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Você pode fazer contribuições se inscrevendo na nossa comunidade de tradução POEditor. Nós estamos procurando a fundo saber isso de você!","You can scan BCB addresses, payment requests and more.":"Você pode analisar seu endereço BCB, pedidos de pagamentos e entre outros.","Your Bitcoin Black Betanet Wallet is ready!":"Sua carteira BCB está pronta!","Your BCB wallet seed is backed up!":"Sua seed da carteira BCB foi recuperada!","Account":"Conta","An account already exists with that name":"Uma conta com este nome já existe","Confirm your PIN":"Confirme seu PIN","Enter a descriptive name":"Insira um nome descritivo","Failed to generate seed QR code":"Falha ao gerar o código QR","Incorrect PIN, try again.":"PIN incorreto, tente novamente.","Incorrect code format for a seed:":"Formato de código incorreto para uma seed.","Information":"Informação","Not a seed QR code:":"Não é um código QR","Please enter your PIN":"Por favor insira seu PIN","Scan this QR code to import seed into another application":"Escaneie este código QR para importar a seed dentro de outra aplicação.","Security Preferences":"Preferências de segurança","Your current password":"Sua senha atual","Your password has been changed":"Sua senha foi mudada","Canoe stores your BCB using cutting-edge security.":"Canoe guarda seu BCB usando segurança de primeira.","Caution":"Cuidado","Decrypting wallet...":"Descriptografando carteira...","Error after loading wallet:":"Erro após carregar a carteira","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Eu entendo que se o aplicativo for deletado, minha carteira só pode ser recuperada com a seed ou um arquivo de backup.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Importar uma carteira remove sua carteira atual e suas contas. Você pode querer fazer o backup de sua seed atual ou fazer um arquivo de backup da sua carteira.","Incorrect code format for an account:":"Formato de código incorreto para uma conta:","Just scan and pay.":"Somente scaneie e pague.","Manage":"Administrar","BCB is Feeless":"BCB não tem taxa","BCB is Instant":"BCB é instantâneo","BCB is Secure":"BCB é seguro","Never pay transfer fees again!":"Nunca pague taxas novamente!","Support":"Suporte","Trade BCB for other currencies like USD or Euros.":"Troque BCB por outras moedas como USD ou Euros.","Transfer BCB instantly to anyone, anywhere.":"Transfira BCB instantaneamente para qualquer pessoa, em qualquer lugar. ","Account Representative":"Conta do representante","Add to address book?":"Adicionar ao livro de endereços?","Alias Found!":"Alias encontrado!","At least 3 Characters.":"Pelo menos 3 caracteres.","Checking availablity":"Verificando diponibilidade","Create Alias":"Criar Alias","Creating Alias...":"Criando Alias","Do you want to add this new address to your address book?":"Quer adicionar este novo endereço ao seu livro de endereços?","Edit your alias.":"Editar Alias.","Editing Alias...":"Editando Alias","Email for recovering your alias":"Recuperar o Alias por Email","Enter a representative account.":"Insere a conta do representante.","Error importing wallet:":"Erro ao importar carteira","How to buy BCB":"Como comprar BCB","How to buy and sell BCB is described at the website.":"Como comprar e vender BCB","Invalid Alias!":"Alias inválido!","Invalid Email!":"Email inválido!","Let People Easily Find you With Aliases":"Permitir pessoas encontrarem-no com o seu Alias","Link my wallet to my phone number.":"Ligar a minha carteira com o meu número de telemóvel","Looking up @{{addressbookEntry.alias}}":"Procurar por @{{addressbookEntry.alias}}","Make my alias private.":"Tornar o meu Alias privado.","Refund":"Reembolso","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Reparar a sua carteira pode demorar algum tempo. Isto vai recarregar todas as blockchains associadas à sua carteira. Tem a certeza que quer reparar?","Representative":"Representante","Representative changed":"Representante mudado","That alias is taken!":"Esse Alias já foi utilizado!","The official English Terms of Service are available on the Canoe website.":"Os Termos de Serviço oficiais em Inglês estão disponíveis no site Canoe.","Valid Alias & Email":"Alias e Email válidos","View Block on BCB Block Explorer":"Ver o bloco em BCB Block Explorer","View on BCB Block Explorer":"Ver em BCB Block Explorer","What alias would you like to reserve?":"Qual Alias gostaria de guardar?","You can change your alias, email, or privacy settings.":"Consegue mudar o seu Alias, email, ou definições de privacidade.","Your old password was not entered correctly":"A sua password antiga não está correta","joe.doe@example.com":"joe.doe@exemplo.com","joedoe":"joedoe","Wallet is Locked":"Canoe está bloqueado","Forgot Password?":"Esqueceu-se da palavra-passe?","4-digit PIN":"PIN de 4 dígitos","Background Behaviour":"Comportamento em segundo plano","Change 4-digit PIN":"Alterar o PIN de 4 dígitos","Change Lock Settings":"Alterar definições de bloqueio","Fingerprint":"Impressão digital","None":"Nenhum","Password":"Palavra-passe","Saved":"Guardado"});
    gettextCatalog.setStrings('ro', {"A member of the team will review your feedback as soon as possible.":"Un membru al echipei va analiza feedback-ul dumneavoastră cât mai curând posibil.","About":"Despre","Account Information":"Informații despre cont","Account Name":"Numele contului","Account Settings":"Setările contului","Account name":"Numele contului","Accounts":"Conturi","Add Contact":"Adaugă contact","Add account":"Adaugă cont","Add as a contact":"Adaugă ca persoană de contact","Add description":"Adaugă descriere","Address Book":"Registru de adrese","Advanced":"Avansate","Advanced Settings":"Setări avansate","Allow Camera Access":"Permite accesul la cameră","Allow notifications":"Permite notificări","Almost done! Let's review.":"Aproape gata! Să revedem.","Alternative Currency":"Valută alternativă","Amount":"Suma","Are you being watched?":"Te observă cineva?","Are you sure you want to delete this contact?":"Eşti sigur că doreşti să ştergi acest contact?","Are you sure you want to delete this wallet?":"Eşti sigur că doreşti să ştergi acest portofel?","Are you sure you want to skip it?":"Ești sigur că dorești să sari peste?","Backup Needed":"Copie de rezervă necesară","Backup now":"Crează copie de rezervă","Backup wallet":"Crează copie de rezervă a potofelului","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Asigură-te că păstrezi seed-ul într-ul loc sigur. Dacă această aplicație e ștearsă sau dispozitivul este furat, seed-ul este unicul mod de a recupera portofelul.","Browser unsupported":"Browser nesuportat","But do not lose your seed!":"Dar nu pierde seed-ul!","Buy &amp; Sell Bitcoin":"Cumpără &amp; vinde Bitcoin","Cancel":"Renunţare","Cannot Create Wallet":"Portofelul nu poate fi creat","Choose a backup file from your computer":"Alege un fișier de backup din calculator","Click to send":"Click pentru a trimite","Close":"Închide","Coin":"Moneda","Color":"Culoare","Commit hash":"Commit hash","Confirm":"Confirmare","Confirm &amp; Finish":"Confirmare &amp; Terminare","Contacts":"Contacte","Continue":"Continuă","Contribute Translations":"Contribuie cu o traducere","Copied to clipboard":"Copiat in clipboard","Copy this text as it is to a safe place (notepad or email)":"Copiază acest text asa cum este intr-un loc sigur (notepad sau email)","Copy to clipboard":"Copiază in clipboard","Could not access the wallet at the server. Please check:":"Portofelul nu poate fi accesat la server. Verifică:","Create Account":"Creare cont","Create new account":"Creare cont nou","Creating Wallet...":"Creare portofel...","Creating account...":"Creare cont...","Creating transaction":"Creare tranzacţie","Date":"Data","Default Account":"Cont implicit","Delete":"Ştergere","Delete Account":"Ştergere cont","Delete Wallet":"Ştergere portofel","Deleting Wallet...":"Ştergere portofel...","Do it later":"Mai târziu","Donate to Bitcoin Black":"Donează pentru Canoe","Download":"Descărcare","Edit":"Editare","Email":"Email","Email Address":"Adresă de email","Enable camera access in your device settings to get started.":"Activează camera in setările device-ului pentru a începe","Enable email notifications":"Activează notificările prin email","Enable push notifications":"Activează notificările push","Enable the camera to get started.":"Activează camera pentru a începe","Enter amount":"Introdu suma","Enter wallet seed":"Introdu seed-ul portofelului","Enter your password":"Introdu parola","Error":"Eroare","Error at confirm":"Eroare la confirmare","Error scanning funds:":"Eroare la scanarea fondurilor:","Error sweeping wallet:":"Eroare în portofel:","Export wallet":"Exportă portofelul","Extracting Wallet information...":"Extragere informaţii portofel","Failed to export":"Export eşuat","Family vacation funds":"Fond vacanțe familiale","Feedback could not be submitted. Please try again later.":"Feedback-ul nu a putut fi trimis. Reîncercați.","File/Text":"Fișier/Text","Filter setting":"Setare filtru","Finger Scan Failed":"Scanarea amprentei eșuată","Finish":"Gata","From":"De la","Funds found:":"Fonduri găsite:","Funds transferred":"Fonduri transferate","Funds will be transferred to":"Fondurile vor fi transferate la","Get started":{"button":"Începe"},"Get started by adding your first one.":"Începe prin a adaugă primul.","Go Back":"Înapoi","Go back":"Înapoi","Got it":"Am înţeles","Help & Support":"Ajutor & Suport","Help and support information is available at the website.":"Informațiile de ajutor și suport sunt disponibile la site-ul web.","Hide Balance":"Ascunde soldul","Home":"Acasă","How could we improve your experience?":"Cum am putea îmbunătăți?","I don't like it":"Nu-mi place","I have read, understood, and agree with the Terms of use.":"Am citit, înțeles, și sunt de acord cu Condițiile de folosire.","I like the app":"Îmi place aplicaţia","I think this app is terrible.":"Cred că această aplicație e oribilă.","I understand":"Am înţeles","I understand that my funds are held securely on this device, not by a company.":"Am înțeles că fondurile mele sunt ținute în siguranță pe acest dispozitiv, și nu de către o companie","I've written it down":"Am notat","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Dacă schimbi dispozitivul sau dacă ștergi aplicația , fondurile tale nu pot fi recuperate fără backup.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Dacă ai alte feedback-uri, trimite-le selectînd opțiunea \"Trimite feedback\" din tab-ul Setări","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Dacă faci o captură de ecran, backup-ul tău poate fi văzut de alte aplicații. Poți face un backup sigur cu un creion și hârtie.","Import Wallet":"Importă portofelul","Import seed":"Importă seed-ul","Import wallet":"Importă portofelul","Importing Wallet...":"Importă portofelul...","In order to verify your wallet backup, please type your password.":"Introdu parola pentru a verifica backup-ul portofelului.","Incomplete":"Incomplet","Insufficient funds":"Fonduri insuficiente","Invalid":"Invalid","Is there anything we could do better?":"Ce putem îmbunătăți?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"E important să notezi corect seed-ul portofelului. Dacă se întîmplă ceva, vei avea nevoie de acest seed pentru a accesa portofelul. Te rog să revezi seed-ul și să încerci din nou.","Language":"Limba","Learn more":"Mai multe informații","Loading transaction info...":"Se încarcă informații despre tranzacție","Log options":"Optiuni de log","Makes sense":"Am înțeles","Matches:":"Potriviri","Meh - it's alright":"Mda - e ok","Memo":"Memo","More Options":"Mai multe opţiuni","Name":"Nume","New account":"Cont nou","No Account available":"Niciun cont disponibil","No contacts yet":"Nu există contacte","No entries for this log level":"Nu există intrări pentru acest nivel de log","No recent transactions":"Nu există tranzacţii recente","No transactions yet":"Nu există tranzacţii","No wallet found":"Nu există niciun portofel","No wallet selected":"Nu e selectat niciun portofel","No wallets available to receive funds":"Nu există nicun portofel disponibil pentru a primi fonduri","Not funds found":"Nu există fonduri","Not now":"Nu acum","Note":"Notă","Notifications":"Notificări","Notify me when transactions are confirmed":"Anunţă-mă când tranzacția a fost confirmată","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Acum e momentul potrivit pentru a face backup-ul portofelului. Dacă pierzi acest dispozitiv, e imposibil să accesezi portofelul fără backup.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Acum e momentul potrivit pentru a cerceta imprejurimile. Exista ferestre in apropiere? Camere ascunse? Priviri peste umar?","Numbers and letters like 904A2CE76...":"Numere și litere ca 904A2CE76...","OK":"OK","OKAY":"OKAY","Official English Disclaimer":"Disclaimer oficial în engleză","Oh no!":"O nu!","Open":"Deschide","Open GitHub":"Deschide GitHub","Open GitHub Project":"Deschide proiectul pe GitHub","Open Settings":"Deschide setarile","Open Website":"Deschide site-ul","Open website":"Deschide site-ul","Paste the backup plain text":"Lipeşte textul backup-ului","Payment Accepted":"Plată acceptată","Payment Proposal Created":"Propunerea de plată a fost creată","Payment Received":"Plată primită","Payment Rejected":"Plată respinsă","Payment Sent":"Plată trimisă","Permanently delete this wallet.":"Şterge definitiv acest portofel","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Notează cu grijă acest seed de 64 caractere. Click pentru a-l copia în clipboard.","Please connect a camera to get started.":"Conectează o cameră pentru a începe","Please enter the seed":"Introdu seed-ul","Please, select your backup file":"Selectează fişierul de backup","Preferences":"Preferinţe","Preparing addresses...":"Pregătire adrese...","Preparing backup...":"Pregătire backup...","Press again to exit":"Apăsa o tastă pentru a ieși","Private Key":"Cheie privată","Private key encrypted. Enter password":"Cheia privată e criptată. Introdu parola","Push Notifications":"Notificări push","QR Code":"Cod QR","Quick review!":"Scurtă revizuire","Rate on the app store":"Evaluare pe app store","Receive":"Primește","Received":"Primit","Recent":"Recent","Recent Transaction Card":"Card tranzacții recente","Recent Transactions":"Tranzacții recente","Recipient":"Destinatar","Release information":"Emitere informații","Remove":"Elimină","Restore from backup":"Restabilire din backup","Retry":"Reîncearcă","Retry Camera":"Reîncearcă camera","Save":"Salvează","Scan":"Scanare","Scan QR Codes":"Scanare coduri QR","Scan again":"Scanează din nou","Scan your fingerprint please":"Scanează amprenta","Scanning Wallet funds...":"Scanare fonduri portofel","Screenshots are not secure":"Capturile de ecran nu sunt sigure","Search Transactions":"Căutare tranzacții","Search or enter account number":"Caută sau introdu numărul contului","Search transactions":"Căutare tranzacții","Search your currency":"Căutare moneda locală","Select a backup file":"Selectează un fișier de backup","Select an account":"Selectează un cont","Send":"Trimite","Send Feedback":"Trimite feedback","Send by email":"Trimite prin email","Send from":"Trimis de la","Send max amount":"Trimite suma maximă","Send us feedback instead":"Trimite-ne feedback","Sending":"Trimitere","Sending feedback...":"Trimitere feedback...","Sending maximum amount":"Trimitere sumă maximă","Sending transaction":"Trimitere tranzacție","Sending {{amountStr}} from your {{name}} account":"Trimitere {{amountStr}} din contul {{name}}","Sent":"Trimis","Services":"Servicii","Session Log":"Log sesiune","Session log":"Log sesiune","Settings":"Setări","Share the love by inviting your friends.":"Invită-ți prietenii","Show Account":"Arată contul","Show more":"Mai mult","Signing transaction":"Semnare tranzacție","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Pentru că doar tu deții controlul banilor tăi, trebuie să salvezi seed-ul portofelului pentru cazul în care aplicația este ștearsă.","Skip":"Treci peste","Slide to send":"Slide pentru a trimite","Sweep":"Şterge","Sweep paper wallet":"Şterge portofelul de hârtie","Sweeping Wallet...":"Ştergere portofel...","THIS ACTION CANNOT BE REVERSED":"ACȚIUNEA NU POATE FI ANULATĂ","Tap and hold to show":"Ține apăsat pentru a afișa","Terms Of Use":"Termeni de utilizare","Terms of Use":"Termeni de utilizare","Text":"Text","Thank you!":"Mulţumesc!","Thanks!":"Mulţumesc!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Foarte interesant. Ne-ar plăcea să câștigăm cea de-a cincea stea de la tine. - cum am putea îmbunătăți experiența ta?","The seed":"Seed-ul","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Seed-ul e nevalid, ar trebui să aibă 64 de caractere: 0-9, A-F","The wallet server URL":"Adresa URL a serverului portofelului","There is an error in the form":"Există o eroare în formular ","There's obviously something we're doing wrong.":"Ceva este greșit ","This app is fantastic!":"Această aplicație este fantastică!","Timeline":"Cronologie","To":"La","Touch ID Failed":"Touch ID a eșuat","Transaction":"Tranzacții","Transfer to":"Transferă către","Transfer to Account":"Transferă în cont","Try again in {{expires}}":"Încercați din nou în","Uh oh...":"Uh of...","Update Available":"Actualizare disponibilă","Updating... Please stand by":"Se actualizează...Va rugăm să așteptați","Verify your identity":"Verificați-va identitatea","Version":"Versiune","View":"Vizualizați","View Terms of Service":"Vizualizați Termenii și Condițiile","View Update":"Vizualizați actualizarea","Wallet Accounts":"Conturi","Wallet File":"Fișierul portofelului","Wallet Seed":"Seed-ul portofelului","Wallet seed not available":"Seed-ul portofelului nu este disponibil","Warning!":"Avertisment!","Watch out!":"Aveți grijă!","We'd love to do better.":"Am dori să ne descurcăm mai bine.","Website":"Site web","What do you call this account?":"Cum doriți să numiți acest cont?","Would you like to receive push notifications about payments?":"Preferați să primiți notificări push legate de plăti?","Yes":"Da","Yes, skip":"Da, sari peste","You can change the name displayed on this device below.":"Puteți schimbă numele afișat pe acest dispozitiv mai jos.","You can create a backup later from your wallet settings.":"Puteți crea o copie de rezervă (backup) mai târziu din setările portofelului.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Puteți vedea ultimele îmbunătățiri aduse acestei aplicații open source și puteți contribui la dezvoltarea acesteia vizitând proiectul nostru pe GitHub.","You can still export it from Advanced &gt; Export.":"Puteți exporta în continuare din meniul Avansat &gt; Export.","You'll receive email notifications about payments sent and received from your wallets.":"O să primiți notificări pe email despre plățile trimise și primite în portofelele dumneavoastră.","Your ideas, feedback, or comments":"Ideile, feedback-ul, sau comentariile dumneavoastră","Your password":"Parola dumneavoastră","Your wallet is never saved to cloud storage or standard device backups.":"Portofelul dumneavoastră nu este niciodată salvat în cloud sau în timpul backup-ului standard al dispozitivului.","[Balance Hidden]":"[]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Am citit, am înțeles, și sunt de acord cu <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Termenii de Utilizare","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Ratingurile de 5 stele ajută Canoe să se răspândească, și noi putem dedică mai multe resurse acestei aplicații!","At least 8 Characters. Make it good!":"Cel putin 8 caractere! Incercati din nou!","Change Password":"Schimbați parola","Confirm New Password":"Confirmați noua parolă","How do you like Canoe?":"Cum vi se pare Canoe?","Let's Start":"Să începem","New Password":"Noua parolă","Old Password":"Vechea parolă","One more time.":"Încă o dată.","Password too short":"Parolă este prea scurtă","Passwords don't match":"Parolele nu corespund","Passwords match":"Parolele corespund","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Notificările push sunt momentan dezactivate pentru Canoe. Le puteți activa în Setări.","Share Canoe":"Share Canoe","There is a new version of Canoe available":"O actualizare pentru Canoe este disponibilă","We're always looking for ways to improve Canoe.":"Căutăm întotdeauna modalități de a îmbunătăți Canoe","We're always looking for ways to improve Canoe. How could we improve your experience?":"Căutăm întotdeauna modalități de a îmbunătăți Canoe. Cum v-am putea îmbunătăți experiența?","Would you be willing to rate Canoe in the app store?":"Sunteți dispuși să evaluați Canoe în app store?","Account Alias":"Aliasul contului","Account Color":"Culoarea contului","Alias":"Alias","Backup seed":"Seed-ul de rezervă","Create Wallet":"Creati un nou portofel","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Limba dorită nu este disponibilă? Înregistrați-va pe POEditor! Dorim să adăugăm și limba dumneavoastră.","Edit Contact":"Editați Contactul","Enter password":"Introduceți parola","Incorrect password, try again.":"Parolă incorectă, încercați din nou.","Joe Doe":"Ion Ionescu","Join the future of money,<br>get started with BCB.":"Alăturați-va viitorului banilor,<br>începeți cu BCB.","Lock wallet":"Blocați Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB este diferit &ndash; nu poate fi stocat în siguranță la bancă sau printr-un serviciu web.","No accounts available":"Nu sunt conturi disponibile","No backup, no BCB.":"Fără backup, fără BCB.","Open POEditor":"Deschide POEditor","Open Translation Site":"Deschide site-ul de translație","Password to decrypt":"Parola pentru decriptare","Password to encrypt":"Parola pentru criptare","Please enter a password to use for the wallet":"Va rugăm să introduceți o parolă pentru portofel","Repair":"Repară","Send BCB":"Trimite BCB","Start sending BCB":"Începeți să trimiteți BCB","To get started, you need BCB. Share your account to receive BCB.":"Pentru a începe, aveți nevoie de BCB. Împărtășiți-va adresa pentru a primi BCB.","To get started, you need an Account in your wallet to receive BCB.":"Pentru a începe, aveți nevoie de un Cont în portofelul dumneavoastră pentru a primi BCB.","Type below to see if an alias is free to use.":"Introduceți mai jos un alias pentru a verifica disponibilitatea.","Use Server Side PoW":"vsfs","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Căutăm întotdeauna contribuții de traducere! Puteți face corecții sau puteți ajuta la traducerea acestei aplicații în limba dumneavoastră nativă alăturându-vă comunității noastre pe POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Puteți contribui la traducerea acestui proiect înregistrându-va pe POEditor. Așteptăm cu nerăbdare să auzim de la dumneavoastră!","You can scan BCB addresses, payment requests and more.":"Puteți scana adrese de BCB, cereri de plată și altele.","Your Bitcoin Black Betanet Wallet is ready!":"Portofelul dumneavoastră de BCB este pregătit!","Your BCB wallet seed is backed up!":"Seed-ul portofelului dumneavoastră este în siguranță! (backup realizat)","Account":"Cont","An account already exists with that name":"Un cont cu acest nume este deja existent","Confirm your PIN":"Confirmați PIN-ul","Enter a descriptive name":"Introduceți un nume descriptiv","Failed to generate seed QR code":"Generarea unui seed de tip QR code a eșuat","Incorrect PIN, try again.":"PIN incorect, încercați din nou.","Incorrect code format for a seed:":"Format incorect pentru un seed","Information":"Informații","Not a seed QR code:":"Nu este un seed de tip cod QR:","Please enter your PIN":"Va rugăm să introduceți PIN-ul","Scan this QR code to import seed into another application":"Scanați acest cod QR pentru a importă seed-ul în altă aplicație","Security Preferences":"Preferințe legate de Securitate","Your current password":"Parolă dumneavoastră curentă","Your password has been changed":"Parolă dumneavoastră a fost schimbată","Canoe stores your BCB using cutting-edge security.":"BCB este stocat de Canoe folosind securitate de ultimă oră.","Caution":"Atenție","Decrypting wallet...":"Decriptez portofelul...","Error after loading wallet:":"Eroare după încărcarea portofelului:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Înțeleg că dacă această aplicație este ștearsă, portofelul meu poate fi recuperat doar folosind seed-ul sau un backup al fișierului portofelului","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Importarea unui portofel determină ștergerea portofelului dumneavoastră curent și a tuturor conturilor. Este recomandat să faceți o copie de rezervă (backup) a fișierului portofelului sau a seed-ului înainte să continuați.","Incorrect code format for an account:":"Format de cod incorect pentru un cont:","Just scan and pay.":"Scanați și plătiți.","Manage":"Administrați","BCB is Feeless":"BCB nu percepe tarife!","BCB is Instant":"BCB este instant","BCB is Secure":"BCB este sigur","Never pay transfer fees again!":"Nu mai platiti tarife niciodata!","Support":"Asistență","Trade BCB for other currencies like USD or Euros.":"Tranzacționați BCB pentru alte valute precum USD sau Euro.","Transfer BCB instantly to anyone, anywhere.":"Transferați BCB în mod instant oricui, oriunde.","Account Representative":"Reprezentantul contului","Add to address book?":"Adaugati la ","Alias Found!":"Alias găsit!","At least 3 Characters.":"Cel putin 3 caractere.","Checking availablity":"Verifică disponibilitatea","Create Alias":"Creați Alias","Creating Alias...":"Creez Alias...","Do you want to add this new address to your address book?":"Doriți să adăugați această adresă în registrul de adrese?","Edit your alias.":"Editați-vă Alias-ul.","Editing Alias...":"Editez Alias-ul...","Email for recovering your alias":"Email pentru recuperarea Aliasului","Enter a representative account.":"Introduceți un cont reprezentativ.","Error importing wallet:":"Eroare la importarea portofelului:","How to buy BCB":"Cum să cumpărați BCB","How to buy and sell BCB is described at the website.":"Pe site este descris cum să cumpărați și să vindeți BCB.","Invalid Alias!":"Alias invalid!","Invalid Email!":"Email invalid!","Let People Easily Find you With Aliases":"Permite oamenilor să mă găsească ușor cu Aliasul","Link my wallet to my phone number.":"Legați portofelul de numărul personal de telefon.","Looking up @{{addressbookEntry.alias}}":"Caut @{{addressbookEntry.alias}} ","Make my alias private.":"Fă Aliasul meu privat.","Refund":"Rambursare","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Repararea portofelului dumneavoastră poate dura ceva timp. Vom reîncarcă blockchain-ul asociat cu acest portofel. Sunteți sigur că doriți să reparați?","Representative":"Reprezentant","Representative changed":"Repezenantul a fost schimbat","That alias is taken!":"Acel Alias este luat!","The official English Terms of Service are available on the Canoe website.":"Termenii serviciului în limba engleză sunt disponibili pe site-ul Canoe.","Valid Alias & Email":"Alias & Email valide","View Block on BCB Block Explorer":"Vizualizați block-ul pe BCB Block Explorer","View on BCB Block Explorer":"Vizualizați pe BCB Block Explorer","What alias would you like to reserve?":"Ce alias ați dori să rezervați?","You can change your alias, email, or privacy settings.":"Va puteți schimba aliasul, email-ul, sau setările de confidențialitate.","Your old password was not entered correctly":"Vechea dumneavoastră parolă nu a fost introdusă corect","joe.doe@example.com":"ion.ionescu@exemplu.com","joedoe":"ionionescu","Wallet is Locked":"Canoe este blocat","Forgot Password?":"Ați uitat parola?","4-digit PIN":"PIN cu 4 cifre","Anyone with your seed can access or spend your BCB.":"Oricine are acces la seed-ul dumneavoastră poate cheltui BCB.","Background Behaviour":"Comportamentul în background","Change 4-digit PIN":"Schimbați PIN-ul cu 4 cifre","Change Lock Settings":"Schimbă setările de blocare","Fingerprint":"Amprentă digitală","Go back to onboarding.":"Reveniți la starea inițială a portofelului.","Hard Lock":"Blocare Hard","Hard Timeout":"Expirare Hard","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Dacă este activat, Proof of Work este delegat serverului Canoe. Această opțiune este dezactivată și este întotdeauna adevărată pe Canoe mobil pentru moment.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Dacă opțiunea este activată, se va afișa o lista cu tranzacțiile recente de pe toate portofelele pe pagină principala (Acasă). Momentan este dezactivată, neimplementată complet.","Lock when going to background":"Blocați aplicația când este în background","None":"Nimic","Password":"Parolă","Saved":"Salvat","Soft Lock":"Blocare Soft","Soft Lock Type":"Tip Blocare Soft","Soft Timeout":"Expirare Soft","Timeout in seconds":"Timeout in secunde","Unrecognized data":"Date nerecunoscute","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Expirare Hard</h5>\n         Cu Expirare Hard, Canoe criptează portofelul dvs. și îl elimină complet din memorie. Nu puteți dezactiva Hard Lock, dar puteți seta o perioadă de timp foarte mare.","A new version of this app is available. Please update to the latest version.":"O nouă versiune a aplicației este disponibilă. Va rugăm să actualizați la cea mai nouă versiune.","Backend URL":"Backend URL","Change Backend":"Schimbati Backend-ul","Change Backend Server":"Schimbati Server-ul Backend","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Importarea unui portofel va determina ștergerea conturilor și portofelelor dumneavoastră existente! Dacă dețineți fonduri în portofelul curent, asigurați-va că aveți o copie de rezervă (backup) pentru restabilire. Scrieți 'delete\" pentru a confirma ștergerea portofelului dumneavoastră curent.","Max":"Maxim","delete":"delete","bitcoin.black":"bitcoin.black","Confirm Password":"Confirmă parola","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Revenind \"la bord\" vom elimita portofelul și conturile dumneavoastră existente! Dacă aveți fonduri în portofelul curent, asigurați-va că aveți o copie de rezervă pentru restaurare. Scrieți \"delete\" pentru a confirmă ștergerea contului curent.","Please enter a password of at least 8 characters":"Introduceți o parolă cu cel puțin 8 caractere","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"Pe acesta pagină puteți vedea toate conturile dumneavoastră. Aruncați o privire<a ng-click=\"openExternalLinkHelp()\">FAQs</a> înainte să începeți!","Play Sounds":"Redă sunete","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">Comportament Background</h5>\n            <p translate=\"\">Alegeți tipul de blocare pe care să îl utilizați atunci când canoe trece în fundal. Pentru a dezactiva blocarea fundalului, selectați Niciuna.\n</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":"<h5 class=\"toggle-label\" translate=\"\">Blocare Soft Lock</h5>\n          <p translate=\"\">Cu Blocare Soft Lock, Canoe este blocat, dar portofelul dvs. este în continuare necriptat în memorie. Activarea funcțiilor Blocare Soft face posibilă utilizarea unor forme de acreditare mai simple, precum PIN-urile și amprentele digitale.</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Alegeți tipul de blocare pe care să îl utilizați atunci când Canoe trece în fundal. Pentru a dezactiva blocarea fundalului, selectați Niciuna.","Encryption Time!":"Timpul pentru criptare!","Enter at least 8 characters to encrypt your wallet.":"Introduceți cel puțin 8 caractere pentru a cripta portofelul dumneavoastră.","Password length ok":"Lungimea parolei este OK","Passwords do not match":"Parolele nu corespund","Unlock":"Deblochează","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Cu Blocare Soft, Canoe este blocat, dar portofelul dvs. este în continuare necriptat în memorie. Activarea funcțiilor Blocare Soft face posibilă utilizarea unor forme de acreditare mai simple, precum PIN-urile și amprentele digitale.","Attributions":"Atribuții","Block was scanned and sent successfully":"Block-ul a fost scanat și trimis cu succes.","Block was scanned but failed to process:":"Block-ul a fost scanat, dar procesarea nu a reușit:","Failed connecting to backend":"Conectare nereușită la backend","Failed connecting to backend, no network?":"Conectare nereușită la backend, rețea indisponibilă?","Successfully connected to backend":"Conectare cu succes la backend","BCB Account":"Contul de BCB","Send BCB to this address":"Trimiteți BCB la această adresă","Please load BCB to donate":"Nu există BCB pentru a face o donație"});
    gettextCatalog.setStrings('ru', {"A member of the team will review your feedback as soon as possible.":"Участник команды рассмотрит ваш отзыв при первой возможности.","About":"О проекте","Account Information":"Информация об аккаунте","Account Name":"Название аккаунта","Account Settings":"Настройки аккаунта","Account name":"Название аккаунта","Accounts":"Аккаунты","Add Contact":"Добавить контакт","Add account":"Добавить аккаунт","Add as a contact":"Добавить контакт","Add description":"Добавить описание","Address Book":"Aдресная книга","Advanced":"Расширенные настройки","Advanced Settings":"Расширенные настройки","Allow Camera Access":"Разрешить доступ к камере","Allow notifications":"Разрешить уведомления","Almost done! Let's review.":"Почти готово! Давайте проверим.","Alternative Currency":"Альтернативная валюта","Amount":"Сумма","Are you being watched?":"За вами сейчас кто-нибудь наблюдает?","Are you sure you want to delete this contact?":"Вы действительно хотите удалить этот контакт?","Are you sure you want to delete this wallet?":"Вы действительно хотите удалить этот кошелёк?","Are you sure you want to skip it?":"Вы точно хотите пропустить резервное копирование?","Backup Needed":"Требуется резервное копирование","Backup now":"Создать резервную копию","Backup wallet":"Резервное копирование","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Обязательно сохраните ваш Seed в надежном месте. Если это приложение будет удалено или ваше устройство будет утеряно, Seed - единственный способ восстановить кошелек.","Browser unsupported":"Браузер не поддерживается","But do not lose your seed!":"Но не потеряйте ваш Seed!","Buy &amp; Sell Bitcoin":"Купить &amp; продать биткойн","Cancel":"Отмена","Cannot Create Wallet":"Не удаётся создать кошелёк","Choose a backup file from your computer":"Выберите файл резервной копии","Click to send":"Отправить","Close":"Закрыть","Coin":"Монета","Color":"Цвет","Commit hash":"Хэш версии","Confirm":"Подтвердить","Confirm &amp; Finish":"Подтвердить &amp; Завершить","Contacts":"Контакты","Continue":"Продолжить","Contribute Translations":"Помочь в переводе","Copied to clipboard":"Скопировано в буфер обмена","Copy this text as it is to a safe place (notepad or email)":"Скопируйте этот текст как есть (в блокнот или письмо)","Copy to clipboard":"Скопировать в буфер обмена","Could not access the wallet at the server. Please check:":"Не удалось получить доступ к кошельку на сервере. Проверьте, пожалуйста:","Create Account":"Создать аккаунт","Create new account":"Создать новый аккаунт","Creating Wallet...":"Создание кошелька...","Creating account...":"Создание аккаунта...","Creating transaction":"Создание транзакции","Date":"Дата","Default Account":"Новый аккаунт","Delete":"Удалить","Delete Account":"Удалить аккаунт","Delete Wallet":"Удалить кошелёк","Deleting Wallet...":"Удаление кошелька...","Do it later":"Отложить","Donate to Bitcoin Black":"Пожертвовать на Canoe","Download":"Скачать","Edit":"Редактировать","Email":"Email","Email Address":"Email","Enable camera access in your device settings to get started.":"Чтобы начать, разрешите доступ к камере в настройках вашего устройства.","Enable email notifications":"Включить email-уведомления","Enable push notifications":"Включить push-уведомления","Enable the camera to get started.":"Чтобы начать, включите камеру.","Enter amount":"Введите сумму","Enter wallet seed":"Введите Seed кошелька","Enter your password":"Введите пароль","Error":"Ошибка","Error at confirm":"Ошибка при подтверждении","Error scanning funds:":"Ошибка сканирования кошелька:","Error sweeping wallet:":"Ошибка считывания кошелька:","Export wallet":"Экспорт кошелька","Extracting Wallet information...":"Извлечение информации о кошельке...","Failed to export":"Не удалось экспортировать","Family vacation funds":"Отпускной бюджет","Feedback could not be submitted. Please try again later.":"Отзыв не может быть отправлен. Пожалуйста, попробуйте позже.","File/Text":"Файл/текст","Filter setting":"Настройка фильтров","Finger Scan Failed":"Не удалось сканировать отпечаток пальца","Finish":"Готово","From":"От","Funds found:":"Обнаружены средства:","Funds transferred":"Средства переведены","Funds will be transferred to":"Средства будут переведены на","Get started":{"button":"Начать"},"Get started by adding your first one.":"Начните, добавив первый контакт.","Go Back":"Вернуться","Go back":"Вернуться","Got it":"Понял","Help & Support":"Помощь и поддержка","Help and support information is available at the website.":"Информация о помощи и поддержке доступна на сайте.","Hide Balance":"Скрыть баланс","Home":"Обзор","How could we improve your experience?":"Как мы можем улучшить ваши навыки?","I don't like it":"Приложение не нравится","I have read, understood, and agree with the Terms of use.":"Я прочитал, понял и согласен с условиями пользования.","I like the app":"Приложение нравится","I think this app is terrible.":"Ужасное приложение.","I understand":"Я понимаю","I understand that my funds are held securely on this device, not by a company.":"Я понимаю, что мои средства безопасно хранятся на устройстве, а не компанией.","I've written it down":"Я записал","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Если это устройство будет заменено или это приложение будет удалено, ваши средства нельзя будет восстановить без резервной копии.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Если вы хотите что-то ещё нам сообщить, пожалуйста, нажмите \"Отправить отзыв\" в разделе Параметры.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Если вы сохраните скриншот, ваша резервная копия может быть просмотрена другими приложениями. Безопасный способ резервного копирования - ручка и бумага.","Import Wallet":"Импорт кошелька","Import seed":"Импортировать Seed","Import wallet":"Импорт кошелька","Importing Wallet...":"Импортирование кошелька...","In order to verify your wallet backup, please type your password.":"Для проверки резервной копии требуется ввести пароль.","Incomplete":"Не все совладельцы присоединились","Insufficient funds":"Недостаточно средств","Invalid":"Недействительно","Is there anything we could do better?":"Есть ли что-то, что мы могли бы сделать лучше?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Важно, чтобы вы правильно записали Seed вашего кошелька. Если что-то случится с вашим кошельком, вам понадобится Seed, чтобы восстановить его. Пожалуйста проверьте ваш Seed и попробуйте снова.","Language":"Язык","Learn more":"Узнать больше","Loading transaction info...":"Загрузка транзакции...","Log options":"Параметры журнала","Makes sense":"Вполне разумно","Matches:":"Совпадения:","Meh - it's alright":"Ну так, терпимо","Memo":"Памятка","More Options":"Дополнительные параметры","Name":"Название","New account":"Новый аккаунт","No Account available":"Ни одного аккаунта не доступно","No contacts yet":"Нет контактов","No entries for this log level":"Для журнала этого уровня записей нету","No recent transactions":"Нет недавних транзакций","No transactions yet":"Транзакций пока не было","No wallet found":"Кошельки не обнаружены","No wallet selected":"Не выбран кошелёк","No wallets available to receive funds":"Некуда перевести средства","Not funds found":"Cредства не обнаружены","Not now":"Потом","Note":"Примечание","Notifications":"Уведомления","Notify me when transactions are confirmed":"Уведомлять при подтверждении транзакций","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Если это устройство окажется утеряно, без резервной копии будет невозможно восстановить доступ к деньгам. Самое время создать резервную копию.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Самое время оценить окружение. Окна поблизости? Скрытые камеры? Подсматривающие через плечо?","Numbers and letters like 904A2CE76...":"Цифры и буквы такие как 904A2CE76...","OK":"ПРОДОЛЖИТЬ","OKAY":"ХОРОШО","Official English Disclaimer":"Официальный оригинал","Oh no!":"О, нет!","Open":"Открыть","Open GitHub":"Открытые GitHub","Open GitHub Project":"Откройте проект GitHub","Open Settings":"Открыть Параметры","Open Website":"Перейти на сайт","Open website":"Открыть сайт","Paste the backup plain text":"Вставьте резервную копию открытым текстом","Payment Accepted":"Платёж принят","Payment Proposal Created":"Платёж предложен","Payment Received":"Платёж получен","Payment Rejected":"Платёж отклонён","Payment Sent":"Платёж отправлен","Permanently delete this wallet.":"Навсегда удалить этот кошелёк.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Пожалуйста, внимательно запишите этот Seed из 64 символов. Нажмите, чтобы скопировать в буфер обмена.","Please connect a camera to get started.":"Чтобы начать, подключите камеру.","Please enter the seed":"Пожалуйста введите Seed","Please, select your backup file":"Пожалуйста, выберите ваш файл резервной копии","Preferences":"Параметры","Preparing addresses...":"Подготовка адресов...","Preparing backup...":"Подготовка резервной копии...","Press again to exit":"Нажмите еще раз для выхода","Private Key":"Приватный ключ","Private key encrypted. Enter password":"Приватный ключ зашифрован. Введите пароль","Push Notifications":"Push-уведомления","QR Code":"QR-код","Quick review!":"Быстрый просмотр!","Rate on the app store":"Оценить в магазине приложений","Receive":"Получить","Received":"Получено","Recent":"Недавние","Recent Transaction Card":"Недавние транзакции","Recent Transactions":"Недавние транзакции","Recipient":"Получатель","Release information":"Информация о версии","Remove":"Удалить","Restore from backup":"Восстановить из резервной копии","Retry":"Повторить попытку","Retry Camera":"Проверить камеру","Save":"Сохранить","Scan":"Сканировать","Scan QR Codes":"Сканирование QR-кодов","Scan again":"Сканировать снова","Scan your fingerprint please":"Пожалуйста, отсканируйте ваш отпечаток пальца","Scanning Wallet funds...":"Сканирование адресов кошелька...","Screenshots are not secure":"Скриншоты не безопасны","Search Transactions":"Поиск транзакций","Search or enter account number":"Поиск или ввод номера аккаунта","Search transactions":"Поиск транзакций","Search your currency":"Найти вашу валюту","Select a backup file":"Выберите файл резервной копии","Select an account":"Выбрать аккаунт","Send":"Отправить","Send Feedback":"Отправить отзыв","Send by email":"Отправить на email","Send from":"Отправить от","Send max amount":"Отправить макс. сумму","Send us feedback instead":"Или отправьте нам отзыв","Sending":"Отправка","Sending feedback...":"Отправка отзыва...","Sending maximum amount":"Отправляю максимальную сумму","Sending transaction":"Отправка транзакции","Sending {{amountStr}} from your {{name}} account":"Отправить {{amountStr}} от вашего аккаунта {{name}}","Sent":"Отправлено","Services":"Службы","Session Log":"Журнал сессии","Session log":"Журнал сессии","Settings":"Параметры","Share the love by inviting your friends.":"Поделитесь любовью и пригласите друзей.","Show Account":"Показать аккаунт","Show more":"Показать еще","Signing transaction":"Подписание транзакции","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Только вы контролируете свои деньги, поэтому вам надо сохранить Seed вашего кошелька на случай, если это приложение будет удалено.","Skip":"Пропустить","Slide to send":"Проведите, чтобы отправить","Sweep":"Считать","Sweep paper wallet":"Пополнить с бумажного кошелька","Sweeping Wallet...":"Считывание кошелька...","THIS ACTION CANNOT BE REVERSED":"ЭТО ДЕЙСТВИЕ НЕ МОЖЕТ БЫТЬ ОТМЕНЕНО","Tap and hold to show":"Коснитесь и удерживайте, чтобы показать","Terms Of Use":"Условия пользования","Terms of Use":"Условия пользования","Text":"Текст","Thank you!":"Спасибо!","Thanks!":"Спасибо!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Приятно слышать. Мы хотели бы получить 5 звезд от вас - как мы можем улучшить приложение для вас?","The seed":"Seed","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Неправильный Seed, должно быть 64 символа: 0-9, A-F","The wallet server URL":"URL сервера кошелька","There is an error in the form":"Ошибка в форме","There's obviously something we're doing wrong.":"Очевидно, мы что-то делаем не так.","This app is fantastic!":"Замечательное приложение!","Timeline":"Хронология","To":"Кому","Touch ID Failed":"Ошибка Touch ID","Transaction":"Транзакция","Transfer to":"Перевести в","Transfer to Account":"Перевод на аккаунт","Try again in {{expires}}":"Попробуйте снова через {{expires}}","Uh oh...":"Упс...","Update Available":"Доступно обновление","Updating... Please stand by":"Обновление... Подождите, пожалуйста","Verify your identity":"Подтвердить личность","Version":"Версия","View":"Просмотреть","View Terms of Service":"Посмотреть условия пользования","View Update":"Просмотреть обновление","Wallet Accounts":"Аккаунты кошелька","Wallet File":"Файл кошелька","Wallet Seed":"Seed кошелька","Wallet seed not available":"Seed кошелька не доступен","Warning!":"Внимание!","Watch out!":"Осторожно!","We'd love to do better.":"Мы хотели бы сделать лучше.","Website":"Сайт","What do you call this account?":"Как вы хотите назвать этот аккаунт?","Would you like to receive push notifications about payments?":"Вы хотели бы получать push-уведомления о платежах?","Yes":"Да","Yes, skip":"Да, пропустить","You can change the name displayed on this device below.":"Ниже вы можете изменить название, отображаемое на этом устройстве.","You can create a backup later from your wallet settings.":"Вы можете создать резервную копию позже из параметров кошелька.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Посетив наш проект на GitHub, вы можете увидеть последние разработки и внести свой вклад в это приложение с открытым исходным кодом.","You can still export it from Advanced &gt; Export.":"Вы можете экспортировать её в Дополнительные параметры &gt; Экспорт.","You'll receive email notifications about payments sent and received from your wallets.":"Вы будете получать email-уведомления о входящих и исходящих платежах.","Your ideas, feedback, or comments":"Ваши идеи, отзывы или комментарии","Your password":"Ваш пароль","Your wallet is never saved to cloud storage or standard device backups.":"Ваш кошелёк никогда не сохраняется в облачное хранилище или в резервные копии устройства.","[Balance Hidden]":"[Баланс скрыт]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Я прочитал, понял и согласен с <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">условиями пользования</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Рейтинг 5 звёзд поможет нам распространить Canoe большему количеству людей, а чем больше пользователей тем больше возможностей появится у приложения.","At least 8 Characters. Make it good!":"Минимум 8 символов. Сделайте его хорошим!","Change Password":"Изменить пароль","Confirm New Password":"Подтверждение нового пароля","How do you like Canoe?":"Что вы думаете о Canoe?","Let's Start":"Давайте начнём","New Password":"Новый пароль","Old Password":"Старый пароль","One more time.":"Ещё раз.","Password too short":"Пароль слишком короткий","Passwords don't match":"Пароли не совпадают","Passwords match":"Пароли совпадают","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Push-уведомления для Canoe сейчас отключены. Включить их можно в Настройках приложения.","Share Canoe":"Поделиться Canoe","There is a new version of Canoe available":"Доступна новая версия Canoe","We're always looking for ways to improve Canoe.":"Мы всегда ищем способы улучшить Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Мы всегда ищем способы улучшить Canoe. Как мы можем улучшить наше приложение для вас?","Would you be willing to rate Canoe in the app store?":"Желаете ли вы оценить Canoe в App Store?","Account Alias":"Псевдоним аккаунта","Account Color":"Цвет аккаунта","Alias":"Псевдоним","Backup seed":"Резервная копия Seed","Create Wallet":"Создать кошелёк","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Не нашли свой язык? Зарегистрируйтесь на POEditor! Мы будем рады добавить поддержку вашего языка.","Edit Contact":"Редактировать контакт","Enter password":"Введите пароль","Incorrect password, try again.":"Неправильный пароль, попробуйте снова.","Joe Doe":"Иван Иванов","Join the future of money,<br>get started with BCB.":"Присоединяйтесь к будущему денег,<br>попробуйте BCB.","Lock wallet":"Заблокировать Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB отличается &ndash; его нельзя безопасно хранить в банке или онлайн-сервисе.","No accounts available":"Ни одного аккаунта не доступно","No backup, no BCB.":"Нет резервной копии, нет BCB.","Open POEditor":"Откройте POEditor","Open Translation Site":"Открыть сайт переводов","Password to decrypt":"Пароль для расшифровки","Password to encrypt":"Пароль для шифрования","Please enter a password to use for the wallet":"Пожалуйста введите пароль, чтобы начать пользоваться кошельком","Repair":"Исправить","Send BCB":"Отправить BCB","Start sending BCB":"Начать отправку BCB","To get started, you need BCB. Share your account to receive BCB.":"Чтобы начать, вам нужно BCB. Поделитесь своим аккаунтом, чтобы получить BCB.","To get started, you need an Account in your wallet to receive BCB.":"Для начала вам потребуется аккаунт, чтобы получать BCB.","Type below to see if an alias is free to use.":"Чтобы узнать свободен ли псевдоним, введите его ниже.","Use Server Side PoW":"Использовать PoW на стороне сервера","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Мы всегда находимся в поиске авторов для переводов! Вы можете внести исправления или помочь сделать это приложение доступным на вашем родном языке, присоединившись к нашему сообществу на POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Вы можете внести свой вклад в перевод, зарегестрировавшись на POEditor. Мы ждем вас!","You can scan BCB addresses, payment requests and more.":"Вы можете сканировать BCB адрес, платежные запросы и многое другое.","Your Bitcoin Black Betanet Wallet is ready!":"Ваш BCB кошелек готов!","Your BCB wallet seed is backed up!":"Резервная копия Seed вашего BCB кошелька создана!","Account":"Аккаунт","An account already exists with that name":"Аккаунт с таким названием уже существует","Confirm your PIN":"Подтвердите ваш PIN","Enter a descriptive name":"Введите информативное имя","Failed to generate seed QR code":"Не удалось создать QR-код Seed","Incorrect PIN, try again.":"Неправильный PIN-код, попробуйте снова.","Incorrect code format for a seed:":"Неправильный формат кода Seed","Information":"Информация","Not a seed QR code:":"Этот QR-код не соответствует Seed:","Please enter your PIN":"Пожалуйста введите ваш PIN-код","Scan this QR code to import seed into another application":"Сканируйте этот QR-код, чтобы импортировать Seed в другое приложение","Security Preferences":"Параметры безопасности","Your current password":"Ваш текущий пароль","Your password has been changed":"Ваш пароль был изменён","Canoe stores your BCB using cutting-edge security.":"Canoe хранит ваши BCB используя передовые технологии безопасности.","Caution":"Предупреждение","Decrypting wallet...":"Расшифровка кошелька...","Error after loading wallet:":"Ошибка при загрузки кошелька","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"Я понимаю, что если это приложение будет удалено, то мой кошелек может быть восстановлен только с помощью Seed или резервной копии файла кошелька.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"При импорте кошелька удаляется текущий кошелек и все его аккаунты. Вы можете сначала сделать резервную копию вашего текущего Seed или резервную копию файла кошелька.","Incorrect code format for an account:":"Неправильный формат кода аккаунта:","Just scan and pay.":"Просто сканируйте и платите.","Manage":"Управлять","BCB is Feeless":"BCB без комиссий","BCB is Instant":"BCB мгновенный","BCB is Secure":"BCB безопасный","Never pay transfer fees again!":"Больше никогда не платите комиссии за переводы!","Support":"Поддержка","Trade BCB for other currencies like USD or Euros.":"Обменивайте BCB на другие валюты, например доллары или евро.","Transfer BCB instantly to anyone, anywhere.":"Переводите BCB мгновенно кому угодно, куда угодно.","Account Representative":"Аккаунт Представителя","Add to address book?":"Добавить в адресную книгу?","Alias Found!":"Псевдоним найдено!","At least 3 Characters.":"Не менее 3 символов.","Checking availablity":"Проверка доступности","Create Alias":"Создать псевдоним","Creating Alias...":"Создание псевдонима...","Do you want to add this new address to your address book?":"Хотите добавить этот новый адрес в вашу адресную книгу?","Edit your alias.":"Изменить свой псевдоним.","Editing Alias...":"Изменение псевдонима...","Email for recovering your alias":"Email для восстановления вашего псевдонима","Enter a representative account.":"Введите аккаунт Представителя.","Error importing wallet:":"Ошибка при импорте кошелька:","How to buy BCB":"Как купить BCB","How to buy and sell BCB is described at the website.":"Как купить и продать BCB описано на сайте.","Invalid Alias!":"Неверный псевдоним!","Invalid Email!":"Неверный Email!","Let People Easily Find you With Aliases":"Позвольте людям легко находить вас по псевдониму","Link my wallet to my phone number.":"Привязать мой кошелёк к моему номеру телефона.","Looking up @{{addressbookEntry.alias}}":"Поиск @{{addressbookEntry.alias}}","Make my alias private.":"Сделать мой псевдоним личным.","Refund":"Возврат","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Исправление вашего кошелька может занять какое-то время. Произойдет перезагрузка всех блокчейнов связанных с вашим кошельком. Вы действительно хотите исправить?","Representative":"Представитель","Representative changed":"Представитель изменён","That alias is taken!":"Этот псевдоним занят!","The official English Terms of Service are available on the Canoe website.":"Условия пользования на английском языке доступны на сайте Canoe.","Valid Alias & Email":"Верный псевдоним и Email","View Block on BCB Block Explorer":"Посмотреть Block на BCB Block Explorer","View on BCB Block Explorer":"Посмотреть на BCB Block Explorer","What alias would you like to reserve?":"Какой псевдоним вы хотели бы зарезервировать?","You can change your alias, email, or privacy settings.":"Вы можете изменить псевдоним, email или параметры конфиденциональности.","Your old password was not entered correctly":"Ваш старый пароль был введен неправильно","joe.doe@example.com":"ivan.ivanov@example.com","joedoe":"ivanivanov","Wallet is Locked":"Canoe заблокирован","Forgot Password?":"Забыли пароль?","4-digit PIN":"4-значный PIN-код","Anyone with your seed can access or spend your BCB.":"Любой кто знает ваш Seed, может получить доступ и потратить ваши BCB.","Background Behaviour":"Поведение в фоновом режиме","Change 4-digit PIN":"Изменить 4-значный PIN-код","Change Lock Settings":"Изменить настройки блокировки","Fingerprint":"Отпечаток пальца","Go back to onboarding.":"Вернуться к регистрации.","Hard Lock":"Жесткая блокировка","Hard Timeout":"Таймаут жесткой блокировки","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Если эта опция включена, то доказательство работы(PoW) делегировано серверу Canoe. Эта опция отключена, но всегда активирована для Canoe на мобильных устройствах.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Если эта опция включена, то список последних транзакций по всем кошелькам появится на вкладке Обзор. Реализовано не полностью.","Lock when going to background":"Заблокировать при переходе в фоновый режим","None":"Нет","Password":"Пароль","Saved":"Сохранено","Soft Lock":"Мягкая блокировка","Soft Lock Type":"Тип мягкой блокировки","Soft Timeout":"Таймаут мягкой блокировки","Timeout in seconds":"Таймаут в секундах","Unrecognized data":"Нераспознанные данные","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Жесткая блокировка</h5>\n          При жесткой блокировке, Canoe шифрует ваш кошелек и полностью удаляет его из оперативной памяти. Отключить жесткую блокировку нельзя, но вы можете установить очень большой таймаут.","A new version of this app is available. Please update to the latest version.":"Доступна новая версия этого приложения. Пожалуйста, обновитесь до последней версии.","Backend URL":"URL сервера","Change Backend":"Изменить сервер","Change Backend Server":"Изменить сервер","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Импортирование кошелька приведет к удалению вашего существующего кошелька и аккаунтов! Если у вас есть средства в текущем кошельке, убедитесь, что у вас есть резервная копия для восстановления. Введите \"удалить\", чтобы подтвердить удаление текущего кошелька.","Max":"Max","delete":"удалить","bitcoin.black":"bitcoin.black","Confirm Password":"Подтвердите пароль","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Возврат к регистрации удалит ваш существующий кошелек и аккаунты! Если у вас есть средства в текущем кошельке, убедитесь, что у вас есть резервная копия для восстановления. Введите \"удалить\", чтобы подтвердить удаление текущего кошелька.","Please enter a password of at least 8 characters":"Пожалуйста введите пароль(не менее 8 символов)","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"На этом экране вы можете видеть все ваши аккаунты. Прочтите <a ng-click=\"openExternalLinkHelp()\">FAQs</a> прежде чем начать!","Play Sounds":"Включить звук","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Выберите тип блокировки которую Canoe будет использовать при переходе в фоновый режим. Для отключения блокировки фонового режима выберите Нет.</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":"<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">При мягкой блокировке Canoe заблокирован, но ваш кошелек будет находиться в незашифрованной области памяти. Включение мягкой блокировки позволяет использовать простые методы идентификации, например PIN-код и цифровой отпечаток пальца.</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Выберите тип блокировки которую Canoe будет использовать при переходе в фоновый режим. Для отключения блокировки фонового режима выберите Нет.","Encryption Time!":"Время шифровать!","Enter at least 8 characters to encrypt your wallet.":"Введите не менее 8 символов, чтобы зашифровать свой кошелек.","Password length ok":"Длина пароля одобрена","Passwords do not match":"Пароли не совпадают","Unlock":"Разблокировать","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"При мягкой блокировке Canoe заблокирован, но ваш кошелек будет находиться в незашифрованной области памяти. Включение мягкой блокировки позволяет использовать простые методы идентификации, например PIN-код и цифровой отпечаток пальца.","Block was scanned and sent successfully":"Блок проверен и успешно отправлен","Block was scanned but failed to process:":"Блок проверен, но его не удалось обработать:","Failed connecting to backend":"Не удалось соединиться с сервером","Failed connecting to backend, no network?":"Не удалось соединиться с сервером, нет связи?","Successfully connected to backend":"Соединение с сервером успешно установлено","BCB Account":"Нано аккаунт","Send BCB to this address":"Отправить Нано на этот адрес"});
    gettextCatalog.setStrings('sk', {"A member of the team will review your feedback as soon as possible.":"Člen tímu posúdi tvoju spätnú väzbu čo najskôr.","About":"O aplikácii","Account Information":"Informácie o účte","Account Name":"Meno účtu","Account Settings":"Nastavenia účtu","Account name":"Názov účtu","Accounts":"Účty","Add Contact":"Pridať účet","Add account":"Pridať účet","Add as a contact":"Pridať kontakt","Add description":"Pridať popis","Address Book":"Zoznam adres","Advanced":"Pokročilé","Advanced Settings":"Pokročilé nastavenia","Allow Camera Access":"Povoliť prístup ku kamere","Allow notifications":"Povoliť notifikácie","Almost done! Let's review.":"Takmer hotovo! Spravme si prehľad.","Alternative Currency":"Alternatívne meny","Amount":"Suma","Are you being watched?":"Nesleduje ťa niekto?","Are you sure you want to delete this contact?":"Si si istý, že chceš vymazať tento kontakt?","Are you sure you want to delete this wallet?":"Si si istý, že chceš zrušiť túto peňaženku?","Are you sure you want to skip it?":"Si si istý, že chceš toto preskočiť?","Backup Needed":"Nutnosť zálohy","Backup now":"Zálohovať teraz","Backup wallet":"Záloha peňaženky","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Uchovaj svoj seed na bezpečnom mieste. Ak je aplikácia vymazaná alebo tvoj mobil ukradnutý, seed je jedinou možnosťou k obnove peňaženky.","Browser unsupported":"Nepodporovaný prehliadač","But do not lose your seed!":"Ale nestrať svoj seed!","Buy &amp; Sell Bitcoin":"Kúp &amp; Predaj Bitcoin","Cancel":"Zrušiť","Cannot Create Wallet":"Nejde vytvoriť peňaženka","Choose a backup file from your computer":"Vyber zálohový súbor zo svojho počítača","Click to send":"Klikni pre odoslanie","Close":"Zavrieť","Coin":"Minca","Color":"Farba","Commit hash":"Commit hash","Confirm":"Potvrdiť","Confirm &amp; Finish":"Potvrdiť &amp; Dokončiť","Contacts":"Kontakty","Continue":"Pokračovať","Contribute Translations":"Pomoc s prekladom","Copied to clipboard":"Skopírované do schránky","Copy this text as it is to a safe place (notepad or email)":"Skopíruj tento text na bezpečné miesto (poznámkový blok alebo email)","Copy to clipboard":"Skopíruj do schránky","Could not access the wallet at the server. Please check:":"Nepodarilo sa pripojiť ku peňaženke na serveri. Prosím skontroluj:","Create Account":"Vytvoriť účet","Create new account":"Vytvoriť nový účet","Creating Wallet...":"Vytváranie peňaženky...","Creating account...":"Vytváranie účtu...","Creating transaction":"Vytváranie transakcie...","Date":"Dátum","Default Account":"Predvolený účet","Delete":"Zmazať","Delete Account":"Zmazať účet","Delete Wallet":"Zmazať peňaženku","Deleting Wallet...":"Prebieha zmazanie peňaženky...","Do it later":"Urobiť to neskôr","Donate to Bitcoin Black":"Podporiť Canoe","Download":"Stiahnuť","Edit":"Upraviť","Email":"Email","Email Address":"Emailová adresa","Enable camera access in your device settings to get started.":"Povoľ prístup ku kamere aby sme mohli začať.","Enable email notifications":"Aktivovať upozornenia na email","Enable push notifications":"Aktivovať push notifikácie","Enable the camera to get started.":"Povoľ prístup aby sme mohli začať.","Enter amount":"Vyplň sumu","Enter wallet seed":"Vlož seed peňaženky","Enter your password":"Vyplň svoje heslo","Error":"Chyba","Error at confirm":"Chyba pri potvrdení","Error scanning funds:":"Chyba pri načítaní prostriedkov:","Error sweeping wallet:":"Chyba pri presune (sweep) peňaženky:","Export wallet":"Export peňaženky","Extracting Wallet information...":"Získavanie informácií z peňaženky...","Failed to export":"Nepodarilo sa uskutočniť export","Family vacation funds":"Rodinné prostriedky na dovolenku","Feedback could not be submitted. Please try again later.":"Tvoj názor sa nepodarilo odoslať. Skús to prosím neskôr znovu.","File/Text":"Súbor/Text","Filter setting":"Nastavenie filtru","Finger Scan Failed":"Snímanie prstu zlyhalo","Finish":"Dokončiť","From":"Od","Funds found:":"Nájdené prostriedky:","Funds transferred":"Prostriedky prevedené","Funds will be transferred to":"Prostriedky budú prevedená na","Get started":{"button":"Začať"},"Go Back":"Ísť späť","Go back":"Ísť späť","Got it":"Rozumiem","Help & Support":"Pomoc & Podpora","Help and support information is available at the website.":"Pomoc a podpora je dostupná na internetovej stránke.","Hide Balance":"Schovať zostatok","Home":"Domov","How could we improve your experience?":"Ako by sme mohli vylepšiť tvoj dojem?","I don't like it":"Nepáči sa mi","I have read, understood, and agree with the Terms of use.":"Prečítal som si, porozumel a súhlasím s Pravidlami používania.","I like the app":"Aplikácia sa mi páči","I think this app is terrible.":"Myslím si, že aplikácia je hrozná","I understand":"Rozumiem","I understand that my funds are held securely on this device, not by a company.":"Rozumiem, že moje prostriedky sú bezpečne uložené na tomto zariadení a nie v nejakej firme.","I've written it down":"Zapísal som si to","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"V prípade výmeny zariadenia alebo zmazania aplikácie nie je možné obnoviť tvoje prostriedky bez zálohy.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Ak máš doplňujúci komentár, prosím daj nám vedieť kliknutím na tlačítko \"Zaslať komentár\" v lište Nastavenia.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Ak si spravíš snímok obrazovky (screenshot), tvoju zálohu môžu vidieť iné aplikácie. Bezpečnejšou variantou je zapísanie pomocou pera a papiera.","Import Wallet":"Import peňaženky","Import seed":"Import seed-u","Import wallet":"Import peňaženky","Importing Wallet...":"Prebieha import peňaženky...","In order to verify your wallet backup, please type your password.":"Prosím napíš svoje heslo pre overenie zálohy peňaženky.","Incomplete":"Nekompletné","Insufficient funds":"Nedostatočný zostatok","Is there anything we could do better?":"Je zde cokoli co můžeme vylepšit?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Je důležité obsah seed peněženky správně. Pokud se cokoli stane s peněženkou, budete potřebovat seed k její obnově. Prosím zkontrolujte si seed ještě jednou.","Language":"Jazyk","Learn more":"Zjistit více","Loading transaction info...":"Načítání detailu transakce..","Log options":"Možnosti logů","Makes sense":"Dávající smysl","Matches:":"Shoda:","Meh - it's alright":"Hmm - to je v pořádku","Memo":"Poznámky","More Options":"Víze možností","Name":"Jméno","New account":"Nový účet","No Account available":"Žádný dostupný účet","No contacts yet":"Prázdné kontakty","No entries for this log level":"Žádné záznamy pro tento log","No recent transactions":"Žádné nedávné transakce","No transactions yet":"Žádné transakce","No wallet found":"Žádné prostředky v peněžence","No wallet selected":"Nevybrána peněženka","No wallets available to receive funds":"Žádná dostupná peněženka k přijetí platby","Not funds found":"Nenalezeny žádné prostředky","Not now":"Ne nyní","Note":"Poznámka","Notifications":"Upozornění","Notify me when transactions are confirmed":"Upozornit při potvzení transakce","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Nyní je vhodná chvíle k vytvoření zálohy peněženky. Pokud je toto zařízení ztraceno, je nemožné získat přístup k prostředkům bez zálohy.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Nyní je vhodná chvíle zkontrolovat vaše okolí. Poblíž okna? Schované kamery? Zvědavci ? ","Numbers and letters like 904A2CE76...":"Čísla a písmena jako 904A2CE76...","OK":"OK","OKAY":"OK","Official English Disclaimer":"Oficiální vyloučení zodpovědnosti","Oh no!":"Ah ne!","Open":"Otevřít","Open GitHub":"Otevřín GitHub","Open GitHub Project":"Otevřít GitHub projekt","Open Settings":"Otevřít nastavení","Open Website":"Otevřít web stránku","Open website":"Otevřít web stránku","Paste the backup plain text":"Vložte holý text zálohy","Payment Accepted":"Platba přijata","Payment Proposal Created":"Vytvořen platební návrh","Payment Received":"Platba přijata","Payment Rejected":"Platba zamítnuta","Payment Sent":"Platba odeslána","Permanently delete this wallet.":"Trvale smazání peněženky.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Prosím opatrně opiště 64 seed. Klikni ke kopii do schránky.","Please connect a camera to get started.":"Ke startu prosím zapojte kameru.","Please enter the seed":"Prosím vložte Váš seed","Please, select your backup file":"Prosím označte Váš soubor se zálohou","Preferences":"Volby","Preparing addresses...":"Připravuji adresy...","Preparing backup...":"Připravuji zálohu...","Press again to exit":"Zmáčkněte znovu pro exit","Private Key":"Privátní klíč","Private key encrypted. Enter password":"Privátní klíč zašifrován. Vložte heslo","Push Notifications":"Oznamovací okénko","QR Code":"QR kód","Quick review!":"Krátký přehled","Rate on the app store":"Hodnocení v App Store","Receive":"Přijmout","Received":"Přijato","Recent":"Poslední","Recent Transaction Card":"Poslední transakce kartou","Recent Transactions":"Poslední transakce","Recipient":"Příjemce","Release information":"Uvolnit informace","Remove":"Odstranit","Restore from backup":"Obnovte zálohu","Retry":"Opustit","Retry Camera":"Vypnou kameru","Save":"Uložit","Scan":"Scanovat","Scan QR Codes":"Scan QR kódu","Scan again":"Scanovat znovu","Scan your fingerprint please":"Scan prstu prosím","Scanning Wallet funds...":"Skenování prostředku peněženky...","Screenshots are not secure":"Screenshot není bezbečný","Search Transactions":"Hledejte transakce","Search or enter account number":"Hledat nebo vložit číslo účtu","Search transactions":"Hledat transakce","Search your currency":"Hledat Vaši měnu","Select a backup file":"Označte soubor zálohy","Select an account":"Vybrat účet","Send":"Poslat","Send Feedback":"Poslat názor","Send by email":"Poslat přes email","Send from":"Pošli z","Send max amount":"Poslat max. částku","Send us feedback instead":"Pošlete nám raději Váš názor","Sending":"Posílání","Sending feedback...":"Posílání názoru","Sending maximum amount":"Posílání max. částky","Sending transaction":"Posílání transakce","Sending {{amountStr}} from your {{name}} account":"Odesílání {{amountStr}} z {{name}} účtu","Sent":"Odesláno","Services":"Servis","Session Log":"Historie log","Session log":"Historie log","Settings":"Nastavení","Share the love by inviting your friends.":"Sdílejte lásku pozváním přátel","Show Account":"Ukazázat účet","Show more":"Ukázat více","Signing transaction":"Podepisuji transakci","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Jelikož jen Vy máte pod kontrolou své peníze, potřebuje si bezpečně uchovat seed peněženky pro případnou obnovu.","Skip":"Skok","Slide to send":"Táhnout a odeslat","Sweep":"Vyprázdnit","Sweep paper wallet":"Vyprazdňuji papírovou peněženku..","Sweeping Wallet...":"Vyprazdňuji papírovou peněženku..","THIS ACTION CANNOT BE REVERSED":"TATO AKCE NEMŮŽE BÝT NAVRÁCENA","Tap and hold to show":"Dotkni a vydrž pro náhled","Terms Of Use":"Podmínky použití","Terms of Use":"Podmínky použití","Text":"Text","Thank you!":"Děkujeme!","Thanks!":"Díky!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"To je zajímavé slyšet. Rádi bychom od Vás získali 5 hvězdičkové hodnocení. Cobychom pro to ještě měli udělat?","The seed":"Rychlost","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Seed není správný. Správný obsahuje 64 znaků 0-9, A-F","The wallet server URL":"Server URL peněženky","There is an error in the form":"Chyba ve formuláři","There's obviously something we're doing wrong.":"Očividně něco děláme špatně.","This app is fantastic!":"Aplikace je výborná!","Timeline":"Časová osa","To":"Ke","Touch ID Failed":"Otisk prstu selhal","Transaction":"Transakce","Transfer to":"Přesun do","Transfer to Account":"Přesun na účet","Try again in {{expires}}":"Zkuste znovu {{expires}}","Uh oh...":"Uh oh...","Update Available":"Dostupná aktualizace","Updating... Please stand by":"Aktualizuji...prosím čekejte","Verify your identity":"Potvrďte svou identitu","Version":"Verze","View":"Ukázat","View Terms of Service":"Ukázat podmínky o použití","View Update":"Ukázat aktualizace","Wallet Accounts":"Účty peněženky","Wallet File":"Soubor peněženky","Wallet Seed":"Seed peněženky","Wallet seed not available":"Seed peněženky není dostupný","Warning!":"Varování","Watch out!":"Sledujte!","We'd love to do better.":"Rádi to uděláme lépe.","Website":"Webová stránka","What do you call this account?":"Jak pojmenujete tento účet?","Would you like to receive push notifications about payments?":"Chcete získat upozornění ohledně plateb?","Yes":"Ano","Yes, skip":"Ano, přeskočit","You can change the name displayed on this device below.":"Můžete změnit jméno zobrazené na tomto displeji níže","You can create a backup later from your wallet settings.":"Vytvořit zálohu můžete později v nastavení peněženky.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Můžete vidět poslední vývoj nebo spolupracovat na tomto open source projektu na GitHub.","You can still export it from Advanced &gt; Export.":"Můžete to stále vyexportovat z Nastavení &gt; Export.","You'll receive email notifications about payments sent and received from your wallets.":"Obdržíte email s upozornění o odesláné, nebo přijaté platbě peněženky.","Your ideas, feedback, or comments":"Vaše nápady, myšlenky a komentáře","Your password":"Vaše heslo","Your wallet is never saved to cloud storage or standard device backups.":"Vaše peněženka není nikdy uložena v Cloudu, nebo v běžné záloze zařízení.","[Balance Hidden]":"[Zůstatek schovaný]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Četl jsem, rozumím a souhlasím s <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Podmínky použití</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"5 hvězdičkové hodnocení pomůže dostat Canoe mezi více lidí a pomůže dalšímu rozvoji aplikace.","At least 8 Characters. Make it good!":"Alespoň 8 znaků.","Change Password":"Změna hesla","Confirm New Password":"Potvrďte heslo","How do you like Canoe?":"Jak se Vám líbí Canoe?","Let's Start":"Začít","New Password":"Nové heslo","Old Password":"Staré heslo","One more time.":"Zopakovat","Password too short":"Heslo příliš krátké","Passwords don't match":"Hesla nesouhlasí","Passwords match":"Hesla souhlasí","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Upozornění z Canoe jsou momentálně vypnuté, Zapnout v nastavení aplikace.","Share Canoe":"Sdílet Canoe","There is a new version of Canoe available":"Nové verze Canoe je dostupná","We're always looking for ways to improve Canoe.":"Vždy hledáme cesty jak vylepšit Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Vždy hledáme cesty jak vylepšit Canoe. Jak můžeme vylepšit Vaše zkušenosti?","Would you be willing to rate Canoe in the app store?":"Ohodnotili byste rádi Canoe v app store ? ","Account Alias":"Alias účtu","Account Color":"Farba účtu","Alias":"Alias","Create Wallet":"Vytvoriť peňaženku","Edit Contact":"Upraviť kontakt","Enter password":"Vložiť heslo","Incorrect password, try again.":"Nesprávne heslo, skúste to znova.","Joe Doe":"Joe Doe","Lock wallet":"Zamknúť Canoe","No accounts available":"Nie sú k dispozícii žiadne účty","No backup, no BCB.":"Žiadna záloha, žiadné BCB.","Open POEditor":"Otvoriť POEditor","Open Translation Site":"Otvorte stránky prekladu","Password to decrypt":"Heslo na dešifrovanie","Password to encrypt":"Heslo na zašifrovanie","Please enter a password to use for the wallet":"Zadajte heslo, ktoré chcete použiť v peňaženke"});
    gettextCatalog.setStrings('sv', {"A member of the team will review your feedback as soon as possible.":"En medlem i teamet kommer ta del av din feedback så snart som möjligt.","About":"Om","Account Information":"Kontoinformation","Account Name":"Kontonamn","Account Settings":"Kontoinställningar","Account name":"Kontonamn","Accounts":"Konton","Add Contact":"Lägg till kontakt","Add account":"Lägg till konto","Add as a contact":"Lägg till som kontakt","Add description":"Lägg till beskrivning","Address Book":"Addressbok","Advanced":"Avancerat","Advanced Settings":"Avancerade inställningar","Allow Camera Access":"Tillåt kamera","Allow notifications":"Tillåt notifieringar","Almost done! Let's review.":"Nästan klart! Låt oss summera.","Alternative Currency":"Alternativ valuta","Amount":"Summa","Are you being watched?":"Är det någon som ser dig?","Are you sure you want to delete this contact?":"Är du säker på att du vill ta bort den här kontakten?","Are you sure you want to delete this wallet?":"Är du säker på att du vill ta bort den här plånboken?","Are you sure you want to skip it?":"Är du säker på att du vill hoppa över det?","Backup Needed":"Säkerhetskopia behövs","Backup now":"Säkerhetskopiera nu","Backup wallet":"Säkerhetskopiera plånbok","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Var noga med att förvara din seed på en säker plats. Om den här appen raderas, eller om din enhet blir stulen, är seeden det enda sättet att återskapa plånboken.","Browser unsupported":"Webbläsaren stöds inte","But do not lose your seed!":"Tappa inte bort din seed!","Buy &amp; Sell Bitcoin":"Köp &amp; Sälj Bitcoin","Cancel":"Avbryt","Cannot Create Wallet":"Kan inte skapa plånbok","Choose a backup file from your computer":"Välj en backup fil från din dator","Click to send":"Klicka för att skicka","Close":"Stäng","Coin":"Mynt","Color":"Färg","Commit hash":"Commit hash","Confirm":"Bekräfta","Confirm &amp; Finish":"Bekräfta & Avsluta","Contacts":"Kontakter","Continue":"Fortsätt","Contribute Translations":"Bidra med översättningar","Copied to clipboard":"Kopierad till urklipp","Copy this text as it is to a safe place (notepad or email)":"Kopiera den här texten till en säker plats","Copy to clipboard":"Kopiera till urklipp","Could not access the wallet at the server. Please check:":"Kan inte ansluta till plånboken på servern. Var god se:","Create Account":"Skapa konto","Create new account":"Skapa nytt konto","Creating Wallet...":"Skapar plånbok...","Creating account...":"Skapar konto...","Creating transaction":"Skapar transaktion","Date":"Datum","Default Account":"Standardkonto","Delete":"Radera","Delete Account":"Ta bort konto","Delete Wallet":"Ta bort plånbok","Deleting Wallet...":"Tar bort plånbok...","Do it later":"Gör det senare","Donate to Bitcoin Black":"Donera till Canoe","Download":"Ladda ner","Edit":"Ändra","Email":"Email","Email Address":"Emailadress","Enable camera access in your device settings to get started.":"Slå på tillgång till kamera i dina enhetsinställningar för att börja.","Enable email notifications":"Slå på emailnotifikationer","Enable push notifications":"Slå på pushnotifikationer","Enable the camera to get started.":"Slå på kamera för att komma igång.","Enter amount":"Ange belopp","Enter wallet seed":"Ange plånbokens seed","Enter your password":"Ange ditt lösenord","Error":"Fel","Error at confirm":"Error vid bekräftelse","Error scanning funds:":"Error vid skanning av medel","Error sweeping wallet:":"Error vid inläsning av pappersplånbok","Export wallet":"Exportera plånbok","Extracting Wallet information...":"Extraherar plånbokens information","Failed to export":"Misslyckades med export","Family vacation funds":"Familjens semesterfond","Feedback could not be submitted. Please try again later.":"Feedback kunde inte skickas. Var god försök igen senare.","File/Text":"Fil/Text","Filter setting":"Filterinställningar","Finger Scan Failed":"Misslyckades skanna finger","Finish":"Avsluta","From":"Från","Funds found:":"Hittade medel","Funds transferred":"Överförda medel","Funds will be transferred to":"Medel kommer överföras till","Get started":{"button":"Kom igång"},"Get started by adding your first one.":"Kom igång genom att lägga till din första.","Go Back":"Gå tillbaka","Go back":"Gå tillbaka","Got it":"Jag förstår","Help & Support":"Hjälp & Support","Help and support information is available at the website.":"Hjälp och supportinformation finns på hemsidan.","Hide Balance":"Göm saldo","Home":"Hem","How could we improve your experience?":"Hur skulle vi kunna förbättra din upplevelse?","I don't like it":"Jag gillar den inte","I have read, understood, and agree with the Terms of use.":"Jag har läst, förstått och godkänner användarvillkoren.","I like the app":"Jag gillar appen","I think this app is terrible.":"Jag tycker den här appen är hemsk.","I understand":"Jag förstår","I understand that my funds are held securely on this device, not by a company.":"Jag förstår att mina medel är i säkert förvar på denna enhet, inte hos ett företag.","I've written it down":"Jag har skrivit ner det","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Ifall den här enheten är utbytt eller ifall den här appen raderas kan du inte få tillbaka dina medel utan en backup.","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Ifall du har ytterligare feedback, låt oss gärna veta genom att trycka på \"Skicka feedback\" under inställningar.","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Ifall du tar en skärmbild kan din backup ses av andra appar. Du kan göra en säker backup med ett vanligt papper och penna.","Import Wallet":"Importera plånbok","Import seed":"Importera seed","Import wallet":"Importera plånbok","Importing Wallet...":"Importerar plånbok...","In order to verify your wallet backup, please type your password.":"För att verifiera din plånbok backup, var god ange ditt lösenord.","Incomplete":"Ofullständig","Insufficient funds":"Otillräckliga medel","Invalid":"Ogiltig","Is there anything we could do better?":"Finns det något vi skulle kunna göra bättre?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Det är viktigt att du skriver ner din seed korrekt. Ifall något händer med din plånbok behöver du denna seed för att återskapa plånboken. Kontroller ditt seed och försök igen.","Language":"Språk","Learn more":"Få veta mer","Log options":"Logginställningar","Makes sense":"Verkar rimligt","Matches:":"Träffar:","Meh - it's alright":"Den duger","Memo":"Memo","More Options":"Mer inställningar","Name":"Namn","New account":"Nytt konto","No Account available":"Inget konto tillgängligt","No contacts yet":"Inga kontakter ännu","No entries for this log level":"Inga rader för denna loggnivå","No transactions yet":"Inga transaktioner än","Not funds found":"Inga medel hittade","Not now":"Inte nu","Notifications":"Notifikationer","OK":"OK","OKAY":"OK","Oh no!":"Åh nej!","Open":"Öppna","Please connect a camera to get started.":"Koppla in en kamera för att komma igång.","Please enter the seed":"Vänligen ange seeden","Please, select your backup file":"Vänligen välj din backupfil","Preferences":"Inställningar","Preparing backup...":"Förbereder backup...","Press again to exit":"Tryck igen för exit","QR Code":"QR-kod","Quick review!":"Snabbkontroll!","Rate on the app store":"Ge betyg på app store","Receive":"Ta emot","Received":"Mottaget","Recipient":"Mottagare","Remove":"Ta bort","Restore from backup":"Återskapa från backup","Retry":"Försök igen","Retry Camera":"Försök igen med kamera","Save":"Spara","Scan":"Skanna","Scan QR Codes":"Skanna QR-koder","Scan again":"Skanna igen","Scan your fingerprint please":"Skanna ditt fngeravtryck","Screenshots are not secure":"Skärmbilder är inte säkra","Search Transactions":"Sök i transaktioner","The seed":"Seeden","Wallet Seed":"Plånbokens seed","Wallet seed not available":"Plånbokens seed är inte tillgängligt","Account":"Konto","At least 3 Characters.":"Åtminstone 3 tecken","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Att reparera din plånbok kan ta lite tid. Detta kommer att hämta alla blockkedjor som din plånbok omfattar. Är du säker på att du vill reparera?","Representative":"Representant","Representative changed":"Ändrat representant","View Block on BCB Block Explorer":"Se blocket på BCB Block Explorer","View on BCB Block Explorer":"Se på BCB Block Explorer","Your old password was not entered correctly":"Ditt gamla lösenord skrevs inte in korrekt","joe.doe@example.com":"joe.doe@example.com","joedoe":"joedoe","Wallet is Locked":"Canoe är låst","Forgot Password?":"Glömt lösenordet?","4-digit PIN":"4 siffrors PIN","Anyone with your seed can access or spend your BCB.":"Den som har din seed kan komma åt och spendera dina BCB.","Background Behaviour":"Beteende i bakgrunden","Change 4-digit PIN":"Ändra 4 siffrors PIN","Change Lock Settings":"Ändra låsinställningar","Fingerprint":"Fingeravtryck","Go back to onboarding.":"Gå tillbaka till onboarding.","Hard Lock":"Hårt lås","Hard Timeout":"Hård timeout","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Ifall påslagen så delegeras \"Proof Of Work\" till Canoes server. Denna inställning är inte aktiv och är alltid påslagen på mobila Canoe tills vidare.","Lock when going to background":"Lås när Canoe går till bakgrunden","None":"Inget","Password":"Lösenord","Saved":"Sparat","Soft Lock":"Mjukt lås","Soft Lock Type":"Mjuk låstyp","Soft Timeout":"Mjuk timeout","Timeout in seconds":"Timeout i sekunder","Unrecognized data":"Oigenkännlig data","A new version of this app is available. Please update to the latest version.":"En ny version av Canoe är tillgänglig. Updatera till den senaste versionen.","Backend URL":"Server URL","Change Backend":"Ändra server","Change Backend Server":"Ändra server","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Importera en plånbok kommer ta bort din nuvarande plånbok och konton! Om du har medel in din nuvarande plånbok, se till att du har en backup att kunna återställa från. Skriv \"delete\" för att bekräfta radering av din nuvarande plånbok.","Max":"Max","delete":"radera","bitcoin.black":"bitcoin.black","Confirm Password":"Bekräfta lösenord","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Ifall du går tillbaka till onboarding tas din existerande plånbok och konton bort! Om du har medel in din nuvarande plånbok, se till att du har en backup att kunna återställa från. Skriv \"radera\" för att bekräfta radering av din nuvarande plånbok.","Please enter a password of at least 8 characters":"Skriv in ett lösenord minst 8 tecken långt","Play Sounds":"Spela ljud","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"Välj låstyp att använda när Canoe läggs i bakgrunden. Välj Ingen för att slå av låsning i bakgrunden.","Encryption Time!":"Krypteringsdags!","Enter at least 8 characters to encrypt your wallet.":"Skriv in minst 8 tecken för att kryptera din plånbok.","Password length ok":"Lösenordets längd ok","Passwords do not match":"Lösenorden matchar inte","Unlock":"Lås upp","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"Med ","Attributions":"Tillskrivningar","Block was scanned and sent successfully":"Blocket skannades och skickades korrekt","Block was scanned but failed to process:":"Blocket skannades men kunde inte behandlas:","Failed connecting to backend":"Kunde inte koppla upp mot servern","Failed connecting to backend, no network?":"Kunde inte koppla upp mot servern, inget nätverk?","Successfully connected to backend":"Uppkopplad mot servern","BCB Account":"BCB-konto","Send BCB to this address":"Skicka BCB till detta konto"});
    gettextCatalog.setStrings('vi', {"A member of the team will review your feedback as soon as possible.":"Một thành viên của đội ngũ phát triển sẽ xem xét hồi đáp của bạn sớm nhất có thể.","About":"Về","Account Information":"Thông tin Tài khoản","Account Name":"Tên Tài khoản","Account Settings":"Xác lập Tài khoản","Account name":"Tên tài khoản","Accounts":"Những tài khoản","Add Contact":"Thêm liên lạc","Add account":"Thêm tài khoản","Add as a contact":"Thêm vào liên lạc","Add description":"Thêm mô tả","Address Book":"Sổ địa chỉ","Advanced":"Nâng cao","Advanced Settings":"Xác lập nâng cao","Allow Camera Access":"Cho phép truy cập Camera","Allow notifications":"Cho phép thông báo","Almost done! Let's review.":"Hầu như đã xong! Hãy kiểm tra lại.","Alternative Currency":"Tiền tệ khác","Amount":"Số lượng","Are you being watched?":"Có phải bạn đang bị theo dõi không?","Are you sure you want to delete this contact?":"Bạn có chắc là muốn xóa bỏ liên lạc này không?","Are you sure you want to delete this wallet?":"Bạn có chắc là muốn xóa bỏ ví này không?","Are you sure you want to skip it?":"Bạn có chắc là muốn bỏ qua nó?","Backup Needed":"Cần thiết phải Sao lưu","Backup now":"Sao lưu ngay","Backup wallet":"Sao lưu ví","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"Hãy chắc rằng bạn lưu trữ seed ở nơi bí mật. Nếu ứng dụng này bị xóa hoặc thiết bị bị ăn trộm, seed là cách duy nhất để tái tạo ví.","Browser unsupported":"Trình duyệt chưa được hỗ trợ","But do not lose your seed!":"Đừng làm mất seed của bạn","Buy &amp; Sell Bitcoin":"Mua &amp; Bán Bitcoin","Cancel":"Hủy bỏ","Cannot Create Wallet":"Không thể Tạo Ví","Choose a backup file from your computer":"Chọn tập tin sao lưu từ máy tính","Click to send":"Bấm để gởi","Close":"Đóng","Coin":"Coin","Color":"Màu sắc","Commit hash":"Mã xác nhận","Confirm":"Xác nhận","Confirm &amp; Finish":"Xác nhận &amp; Hoàn tất","Contacts":"Liên lạc","Continue":"Tiếp tục","Contribute Translations":"Đóng góp vào bản dịch","Copied to clipboard":"Đã sao chép vào clipboard","Copy this text as it is to a safe place (notepad or email)":"Sao chép nội dung này vào mội nơi an toàn (sổ sách hoặc email)","Copy to clipboard":"Sao chép vào clipboard","Could not access the wallet at the server. Please check:":"Không thể truy cập ví ở máy chủ. Vui lòng kiểm tra:","Create Account":"Tạo Tài khoản","Create new account":"Tạo tài khoản mới","Creating Wallet...":"Đang tạo Ví...","Creating account...":"Đang tạo tài khoản...","Creating transaction":"Đang tạo giao dịch","Date":"Ngày tháng","Default Account":"Tài khoản Mặc định","Delete":"Xóa bỏ","Delete Account":"Xóa bỏ Tài khoản","Delete Wallet":"Xóa bỏ Ví","Deleting Wallet...":"Đang xóa bỏ Ví...","Do it later":"Làm điều đó sau","Donate to Bitcoin Black":"Đóng góp cho Canoe","Download":"Download","Edit":"Chỉnh sửa","Email":"Email","Email Address":"Địa chỉ Email","Enable camera access in your device settings to get started.":"Cho phép truy cập camera trong thiết bị của bạn để bắt đầu.","Enable email notifications":"Cho phép thông báo bằng email","Enable push notifications":"Cho phép thông báo","Enable the camera to get started.":"Cho phép camera để bắt đầu","Enter amount":"Nhập vào số lượng","Enter wallet seed":"Nhập vào seed của ví","Enter your password":"Nhập vào mật khẩu","Error":"Lỗi","Error at confirm":"Lỗi khi xác nhận","Error scanning funds:":"Lỗi khi quét số dư:","Error sweeping wallet:":"Lỗi khi đọc ví:","Export wallet":"Xuất ví","Extracting Wallet information...":"Trích xuất Nội dung Ví","Failed to export":"Thất bại khi xuất","Family vacation funds":"Tiền du lịch của gia đình","Feedback could not be submitted. Please try again later.":"Hồi đáp không thể gởi. Vui lòng thử lại trong chốc lát.","File/Text":"Tệp/Văn bản","Filter setting":"Xác lập Bộ lọc","Finger Scan Failed":"Quét Dấu vân tay Thất bại","Finish":"Hoàn tất","From":"Từ","Funds found:":"Tiền đã tìm thấy:","Funds transferred":"Tiền đã chuyển","Funds will be transferred to":"Tiền sẽ được chuyển đến","Get started":{"button":"Bắt đầu"},"Get started by adding your first one.":"Bắt đầu bằng việc thêm vào cái đầu tiên của bạn.","Go Back":"Quay Lại","Go back":"Quay lại","Got it":"Đã nhận được","Help & Support":"Giúp đỡ & Hỗ trợ","Help and support information is available at the website.":"Nội dung giúp đỡ và hỗ trợ hiện có trên website.","Hide Balance":"Che số dư","Home":"Trang nhà","How could we improve your experience?":"Làm thế nào chúng tôi có thể cải tiến trải nghiệm của bạn?","I don't like it":"Tôi không thích nó","I have read, understood, and agree with the Terms of use.":"Tôi đã đọc, hiểu, và đồng ý với tất cả Điều khoản sử dụng","I like the app":"Tôi thích ứng dụng này","I think this app is terrible.":"Tôi nghĩ ứng dụng này tệ hại","I understand":"Tôi hiểu","I understand that my funds are held securely on this device, not by a company.":"Tôi hiểu rằng tiền của tôi được lưu trữ an toàn trên thiết bị này, không phải bởi công ty.","I've written it down":"Tôi đã viết nó xuống rồi","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"Nếu thiết bị này bị thay thế hoặc phần mềm bị gỡ bỏ, tiền của bạn không thể phục hồi mà không có bản sao lưu","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"Nếu bạn có thêm phản hồi, vui lòng cho chúng tôi biết bằng cách bấm vào tùy chọn \"Gởi phản hồi\" ở mục Xác lập","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"Nếu bạn chụp hình, bản sao lưu có thể bị nhìn trộm bằng ứng dụng khác. Bạn có thể tạo bạn sao lưu an toàn với giấy và bút.","Import Wallet":"Nhập Ví","Import seed":"Nhập seed","Import wallet":"Nhập ví","Importing Wallet...":"Đang nhập ví...","In order to verify your wallet backup, please type your password.":"Để chứng thực bản sao của ví, vui lòng gõ vào mật khẩu.","Incomplete":"Chưa hoàn tất","Insufficient funds":"Không đủ tiền","Invalid":"Chưa hợp lệ","Is there anything we could do better?":"Chúng tôi có thể làm gì tốt hơn?","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"Điều quan trọng là bạn viết chính xác seed của ví. Nếu có chuyện gì xảy ra với ví của bạn, thì bạn cần seed để khôi phục. Hãy kiểm tra seed và thử lại.","Language":"Ngôn ngữ","Learn more":"Tìm hiểu thêm","Loading transaction info...":"Đang nạp thông tin giao dịch...","Log options":"Tùy chọn Log","Makes sense":"Hợp lý","Matches:":"Trùng:","Meh - it's alright":"Ê - được đó","Memo":"Ghi nhớ","More Options":"Thêm Tùy chọn","Name":"Tên","New account":"Tài khoản mới","No Account available":"Không có Tài khoản","No contacts yet":"Chưa có liên lạc nào","No entries for this log level":"Không có bất cứ mục nào cho cấp độ log này","No recent transactions":"Không có giao dịch nào gần đây","No transactions yet":"Không có giao dịch","No wallet found":"Ví không tìm thấy","No wallet selected":"Không có ví nào được lựa chọn","No wallets available to receive funds":"Không có ví nào để nhận tiền","Not funds found":"Tiền không thấy","Not now":"Không phải bây giờ","Note":"Ghi chú","Notifications":"Thông báo","Notify me when transactions are confirmed":"Thông báo cho tôi khi giao dịch đã được xác nhận","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"Bây giờ là lúc tốt để sao lưu ví. Nếu thiết bị bị mất, thì bạn không thể truy cập tiền mà không có bản sao lưu.","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"Bây giờ là lúc hoàn hảo để kiểm tra xung quanh. Gần cửa sổ? Camera ẩn? Ai theo dõi sau lưng?","Numbers and letters like 904A2CE76...":"Số và chữ như 904A2CE76...","OK":"OK","OKAY":"OKAY","Official English Disclaimer":"Từ chối Trách nhiệm","Oh no!":"Ồ không!","Open":"Mở","Open GitHub":"Mở GitHub","Open GitHub Project":"Mở Dự án GitHub","Open Settings":"Mở Xác lập","Open Website":"Mở Website","Open website":"Mở website","Paste the backup plain text":"Dán vào văn bản của bản sao lưu","Payment Accepted":"Thanh toán được Chấp nhận","Payment Proposal Created":"Kế hoạch Thanh toán đã Tạo","Payment Received":"Thanh toán đã Nhận","Payment Rejected":"Thanh toán bị Từ chối","Payment Sent":"Thanh toán đã Gởi","Permanently delete this wallet.":"Xóa ví ngay lập tức.","Please carefully write down this 64 character seed. Click to copy to clipboard.":"Vui lòng viết cận thận 64 ký tự seed. Bấm để sao chép vào clipboard.","Please connect a camera to get started.":"Vui lòng kết nối camera để bắt đầu.","Please enter the seed":"Vui lòng nhập vào seed","Please, select your backup file":"Vui lòng chọn tập tin sao lưu","Preferences":"Ưu tiên","Preparing addresses...":"Chuẩn bị địa chỉ...","Preparing backup...":"Chuẩn bị sao lưu...","Press again to exit":"Bấm lại để thoát","Private Key":"Chìa khóa Bí mật","Private key encrypted. Enter password":"Chìa khóa bí mật bị mã hóa. Nhập vào mật khẩu","Push Notifications":"Đẩy Thông báo","QR Code":"Mã QR","Quick review!":"Kiểm tra nhanh!","Rate on the app store":"Đánh giá trên app store","Receive":"Nhận","Received":"Đã nhận","Recent":"Gần đây","Recent Transaction Card":"Thẻ Giao dịch Gần đây","Recent Transactions":"Giao dịch gần đây","Recipient":"Người nhận","Release information":"Để lại thông tin","Remove":"Xoá","Restore from backup":"Khôi phục từ sao lưu","Retry":"Thử lại","Retry Camera":"Thử lại máy ảnh","Save":"Lưu","Scan":"Quét","Scan QR Codes":"Quét mã QR","Scan again":"Quét lại","Scan your fingerprint please":"Quét vân tay bạn","Scanning Wallet funds...":"Đang cập nhập số dư ví....","Screenshots are not secure":"Chụp màn hình không an toàn","Search Transactions":"Tìm kiếm giao dịch","Search or enter account number":"Tìm hoặc điền số tài khoản","Search transactions":"Tìm kiếm giao dịch","Search your currency":"Tìm ngoại tệ của bạn","Select a backup file":"Chọn file sao lưu","Select an account":"Chọn tài khoản","Send":"Gửi","Send Feedback":"Gửi phản hồi","Send by email":"Gửi bằng email","Send from":"Gửi từ","Send max amount":"Gửi số tiền tối đa","Send us feedback instead":"Hãy gửi cho chúng tôi phản hồi","Sending":"Đang gửi","Sending feedback...":"Đang gửi phản hồi...","Sending maximum amount":"Đang gửi số tiền tối đa","Sending transaction":"Đang gửi giao dịch","Sending {{amountStr}} from your {{name}} account":"Đang gửi {{amountStr}} từ {{name}} tài khoản","Sent":"Đã gửi","Services":"Dịch vụ","Session Log":"Nhật ký phiên","Session log":"Nhật ký phiên","Settings":"Cài đặt","Share the love by inviting your friends.":"Chia sẻ tình yêu bằng cách mời các bạn của bạn","Show Account":"Hiện tài khoản","Show more":"Hiện thêm","Signing transaction":"Đang ký giao dịch","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"Vì chỉ bạn mới có thể điều khiển tiền của bạn, bạn cần lưu chìa khóa ví trong trường hợp ứng dụng này bị xóa","Skip":"Bỏ qua","Slide to send":"Trượt để gửi","Sweep":"Quét","Sweep paper wallet":"Quét ví giấy","Sweeping Wallet...":"Đang quét ví...","THIS ACTION CANNOT BE REVERSED":"HÀNH ĐỘNG NÀY KHÔNG THỂ BỊ HỦY","Tap and hold to show":"Ấn và giữ để hiện","Terms Of Use":"Điều khoản sử dụng","Terms of Use":"Điều khoản sử dụng","Text":"Văn bản","Thank you!":"Cảm ơn bạn!","Thanks!":"Cảm ơn!","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"Thật vui khi biết. Chúng tôi mong rằng có thể nhận được sao thứ 5 từ bạn - làm sao để chúng tôi có thể nâng cao trải nghiệm của bạn?","The seed":"Chìa khóa","The seed is invalid, it should be 64 characters of: 0-9, A-F":"Chìa khóa ví đã sai, nó phải bao gồm 64 ký tự bao gồm: 0-9, A-F","The wallet server URL":"Địa chỉ máy chủ của ví","There is an error in the form":"Có lỗi trong form này","There's obviously something we're doing wrong.":"Chắc chắn có một thứ chúng tôi đang làm sai.","This app is fantastic!":"Ứng dụng này thật tuyệt!","Timeline":"Dòng thời gian","To":"Tới","Touch ID Failed":"Xác thực vân tay thất bại","Transaction":"Giao dịch","Transfer to":"Chuyển tới","Transfer to Account":"Chuyển tới tài khoản","Try again in {{expires}}":"Thử lại trong {{expires}}","Uh oh...":"Ôi trời...","Update Available":"Có cập nhật mới","Updating... Please stand by":"Đang cập nhật... Vui lòng chờ","Verify your identity":"Xác nhận danh tính của bạn","Version":"Phiên bản","View":"Xem","View Terms of Service":"Xem điều khoản Dịch vụ","View Update":"Xem cập nhật","Wallet Accounts":"Tài khoản ví","Wallet File":"Tệp tin ví","Wallet Seed":"Chìa khóa Ví","Wallet seed not available":"Chìa khóa Ví không sẵn có","Warning!":"Cảnh báo!","Watch out!":"Cẩn thận!","We'd love to do better.":"Chúng tôi rất muốn làm tốt hơn.","Website":"Trang Web","What do you call this account?":"Bạn muốn gọi tài khoản này là gì?","Would you like to receive push notifications about payments?":"Bạn có muốn nhận thông báo đẩy về các khoản thanh toán?","Yes":"Có","Yes, skip":"Có, bỏ qua","You can change the name displayed on this device below.":"Bạn có thể đổi tên hiển thị trên thiết bị này ở dưới.","You can create a backup later from your wallet settings.":"Bạn có thể tạo 1 bản sao lưu trong cài đặt Ví vào lúc sau.","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"Bạn có thể xem cái cập nhật và đóng góp mới nhất trong ứng dụng nguồn mở này bằng các xem các dự án của chúng tôi trên GitHub.","You can still export it from Advanced &gt; Export.":"Bạn vẫn có thể xuất nó từ Advanced &gt; Export.","You'll receive email notifications about payments sent and received from your wallets.":"Bạn sẽ được nhận các email thông báo về các khoản giao dịch được gửi và nhận trong Ví của bạn.","Your ideas, feedback, or comments":"Ý tưởng, phản hồi và bình luận của bạn.","Your password":"Mật khẩu của bạn","Your wallet is never saved to cloud storage or standard device backups.":"Ví của bạn sẽ không bao giờ được lưu trên mạng hay các thiết bị lưu trữ,","[Balance Hidden]":"[Số dư bị ẩn]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"Tôi đã đọc, hiểu và đồng ý với <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Điều Khoản Sử Dụng</a>.","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"Xếp hạng 5 sao giúp mọi người biết đến Canoe nhiều hơn và nhiều người dùng hơn có nghĩa là nhiều tài nguyên hơn có thể được cam kết với ứng dụng!","At least 8 Characters. Make it good!":"Ít nhất 8 ký tự. Hãy chọn!","Change Password":"Đổi mật khẩu","Confirm New Password":"Xác nhận mật khẩu mới","How do you like Canoe?":"Bạn có thích Canoe không?","Let's Start":"Hãy bắt đầu nào","New Password":"Mật khẩu mới","Old Password":"Mật khẩu cũ","One more time.":"Một lần nữa.","Password too short":"Mật khẩu quá ngắn","Passwords don't match":"Hai mật khẩu không giống nhau.","Passwords match":"Mật khẩu giống nhau.","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Thông báo đẩy từ Canoe hiện đang bị tắt. Hãy bật chúng từ trong cài đặt của ứng dụng","Share Canoe":"Chia sẻ Canoe","There is a new version of Canoe available":"Có một bản cập nhật mới của Canoe","We're always looking for ways to improve Canoe.":"Chúng tôi luôn tìm các cách để cải thiện Canoe.","We're always looking for ways to improve Canoe. How could we improve your experience?":"Chúng tôi luôn tìm các cách để cải thiện Canoe. Làm sao để chúng tôi có thể nâng cao trải nghiệm của bạn?","Would you be willing to rate Canoe in the app store?":"Bạn có thể đánh giá Canoe trong App Store được không?","Account Alias":"Bí danh tài khoản","Account Color":"Màu tài khoản","Alias":"Bí danh","Backup seed":"Chìa khóa lưu trữ","Create Wallet":"Tạo Ví","Don't see your language? Sign up on POEditor! We'd love to support your language.":"Không thấy ngôn ngữ của bạn? Đăng ký trên POEditor! Chúng tôi rất muốn có ngôn ngữ của bạn.","Edit Contact":"Chỉnh sửa danh bạ","Enter password":"Nhập mật khẩu","Incorrect password, try again.":"Sai mật khẩu, thử lại.","Joe Doe":"Joe Doe","Join the future of money,<br>get started with BCB.":"Hãy tham gia vào tương lai của tiền,<br> hãy bắt đầu với BCB.","Lock wallet":"Khóa Canoe","BCB is different – it cannot be safely held with a bank or web service.":"BCB khác &ndash; nó không thể giữ an toàn bởi ngân hàng hay các dịch vị web","No accounts available":"Không có tài khoản nào hiện có","No backup, no BCB.":"Không lưu chìa khóa, không phải BCB của bạn.","Open POEditor":"Mở POEditor","Open Translation Site":"Mở trang dịch","Password to decrypt":"Mật khẩu để giải mã","Password to encrypt":"Mật khẩu để mã hóa","Please enter a password to use for the wallet":"Vui lòng nhập mật khẩu để sử dụng Ví","Repair":"Sửa chữa","Send BCB":"Gửi BCB","Start sending BCB":"Bắt đầu gửi BCB","To get started, you need BCB. Share your account to receive BCB.":"Để bắt đầu, bạn cần có BCB. Hãy chia sẻ tài khoản của bạn để nhận BCB.","To get started, you need an Account in your wallet to receive BCB.":"Để bắt đầu, bạn cần một tài khoản trong ví để nhận BCB.","Type below to see if an alias is free to use.":"Hãy điền một bí danh để xem có thể dùng không.","Use Server Side PoW":"Sử dụng PoW từ một máy chủ","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"Chúng tôi luôn tìm kiếm những đóng góp dịch ứng dụng! Bạn có thể sửa chữa hoặc trợ giúp làm cho ứng dụng này có sẵn bằng ngôn ngữ của bạn bằng cách tham gia cộng đồng của chúng tôi trên POEditor.","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"Bạn có thể đóng góp bằng cách đăng ký dự án dịch trên POEditor của chúng tôi. Chúng tôi mong muốn được nghe từ bạn!","You can scan BCB addresses, payment requests and more.":"Bạn thể scan địa chỉ BCB, yêu cầu thanh toán và hơn nữa.","Your Bitcoin Black Betanet Wallet is ready!":"Ví BCB của bạn đã sẵn sàng!","Your BCB wallet seed is backed up!":"Chìa khóa Ví BCB của bạn đã được lưu!","Account":"Tài khoản","An account already exists with that name":"Đã có tài khoản tồn tại với tên này","Confirm your PIN":"Hãy xác thực mã PIN","Enter a descriptive name":"Hãy điền một tên mô tả","Failed to generate seed QR code":"Thất bại khi tạo ra chìa khóa bằng mã QR","Incorrect PIN, try again.":"Mã PIN sai, hãy thử lại.","Incorrect code format for a seed:":"ĐỊnh dạng chìa khóa sai.","Information":"Thông tin","Not a seed QR code:":"Không phải là chìa khóa mã QR","Please enter your PIN":"Hãy điền PIN của bạn","Scan this QR code to import seed into another application":"Quét mã QR này để nhập chìa khóa vào một ứng dụng khác.","Security Preferences":"Tùy chọn cài đặt","Your current password":"Mật khẩu hiện thời của bạn","Your password has been changed":"Mật khẩu của bạn đã được đổi","Canoe stores your BCB using cutting-edge security.":"Canoe lưu trữ BCB của bạn bằng biện phát an ninh tiên tiến.","Caution":"Cảnh báo","Decrypting wallet...":"Đang giải mã Ví...","Error after loading wallet:":"Lỗi khi mở Ví:","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"T hiểu rằng nếu ứng dụng này bị xóa, Ví của tôi chỉ có thể khôi phục bằng chìa khóa hoặc file sao lưu của Ví.","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"Nhập ví sẽ bỏ ví hiện tại của bạn và tất cả các tài khoản của nó. Bạn có thể muốn sao lưu chìa khóa hiện tại của mình hoặc thực hiện sao lưu tệp tin của ví.","Incorrect code format for an account:":"Định dạng mã không chính xác cho tài khoản.","Just scan and pay.":"Hãy quét và trả.","Manage":"Quản lý","BCB is Feeless":"BCB không mất phí","BCB is Instant":"BCB được gửi và nhận ngay tức khắc","BCB is Secure":"BCB rất bảo mật","Never pay transfer fees again!":"Không giờ phải trả phí chuyển tiền nữa!","Support":"Hỗ trợ","Trade BCB for other currencies like USD or Euros.":"Đổi BCB thành các ngoại tệ khác như USD hay Euros.","Transfer BCB instantly to anyone, anywhere.":"Chuyển BCB ngay lập tức cho bất kỳ ai, bất kỳ đâu.","Account Representative":"Đại diện tài khoản","Add to address book?":"Thêm vào liên hệ?","Alias Found!":"Bí danh đã được tìm thấy!","At least 3 Characters.":"Ít nhất 3 ký tự.","Checking availablity":"Đang kiểm tra tính khả dụng","Create Alias":"Tạo Tên","Creating Alias...":"Tạo Tên...","Do you want to add this new address to your address book?":"Bạn có muốn thêm địa chỉ mới này vào danh bạ?","Edit your alias.":"Chỉnh sửa tên.","Editing Alias...":"Chỉnh sửa tên...","Email for recovering your alias":"Email để khôi phục bí danh của bạn","Enter a representative account.":"Hãy điền một đại diện cho tài khoản.","Error importing wallet:":"Lỗi khi nhập Ví:","How to buy BCB":"Mua BCB bằng cách nào","How to buy and sell BCB is described at the website.":"Làm sao để mua và bán BCB được hướng dẫn tại website.","Invalid Alias!":"Bí danh sai!","Invalid Email!":"Email không đúng!","Let People Easily Find you With Aliases":"Hãy để mọi người tìm bạn dễ hơn với một bí danh","Link my wallet to my phone number.":"Liên kết Ví với số điện thoại của tôi.","Looking up @{{addressbookEntry.alias}}":"Đang tìm @{{addressbookEntry.alias}}","Make my alias private.":"Hãy làm bí danh của tôi riêng tư.","Refund":"Hoàn tiền","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"Sửa chữa ví của bạn có thể mất một thời gian. Điều này sẽ tải lại tất cả các blockchains liên kết với ví của bạn. Bạn có chắc chắn muốn sửa chữa không?","Representative":"Đại diện","Representative changed":"Đã thay đổi đại diện","That alias is taken!":"Tên này đã dùng rồi!","The official English Terms of Service are available on the Canoe website.":"Điều khoản sử dụng bằng tiếng Anh đã có trên website Canoe","Valid Alias & Email":"Tên hợp lệ & Email","View Block on BCB Block Explorer":"Xem Khối trên BCB Block Explorer","View on BCB Block Explorer":"Xem trên BCB Block Explorer","What alias would you like to reserve?":"Tên mà bạn muốn dữ trữ?","You can change your alias, email, or privacy settings.":"Bạn có thể đổi tên, email, hoặc xác lập riêng tư.","Your old password was not entered correctly":"Mật khẩu cũ bạn nhập chưa đúng","joe.doe@example.com":"joe.doe@example.com","joedoe":"joedoe","Wallet is Locked":"Canoe bị Khóa","Forgot Password?":"Quên Mật khẩu?","4-digit PIN":"Mã PIN 4 số","Anyone with your seed can access or spend your BCB.":"Ai có seed của bạn đều có thể truy cập hoặc tiêu xài BCB đó.","Background Behaviour":"Hành vi khi không sử dụng","Change 4-digit PIN":"Thay đổi mã 4 số PIN","Change Lock Settings":"Thay đổi Xác lập Khóa","Fingerprint":"Dấu vân tay","Go back to onboarding.":"Quay lại tổ chức.","Hard Lock":"Khóa cứng","Hard Timeout":"Giới hạn thời gian","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"Nếu được kích hoạt, Proof Of Work được bàn giao về phía máy chủ Canoe. Tùy chọn này bị vô hiệu và luôn luôn đúng trên thiết bị di động Canoe.","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"Nếu được kích hoạt, lịch sử giao dịch gần đây của tất cả các ví sẽ xuất hiện ở trang chủ. Hiện tại chưa được lập trình.","Lock when going to background":"Khóa lại khi không sử dụng","None":"Không","Password":"Mật khẩu","Saved":"Đã lưu trữ","Soft Lock":"Khóa mềm","Soft Lock Type":"Kiểu khóa mềm","Soft Timeout":"Hạn thời gian mềm","Timeout in seconds":"Hạn thời gian theo giây","Unrecognized data":"Không hiểu được dữ liệu","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          Với khóa cứng, Canoe mã hóa ví của bạn và xóa hoàn toàn khỏi bộ nhớ Ram. Bạn không thể tắt khóa cứng, nhưng bạn có thể đặt thời gian chờ khóa.","A new version of this app is available. Please update to the latest version.":"Một bản cập nhật mới của ứng dụng này đã có. Vui lòng cập nhật lên bản mới nhât.","Backend URL":"URL phụ trợ","Change Backend":"Đã đổi phụ trợ","Change Backend Server":"Đổi máy chủ phụ trợ","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"Nhập một Ví mới sẽ xóa Ví hiện tại và các tài khoản! Nếu bạn có tiền trong ví hiện tại, hãy nhớ đã sao lưu để có thể khôi phục lại.","Max":"Tối đa","delete":"Xóa","bitcoin.black":"bitcoin.black"});
    gettextCatalog.setStrings('zh-CN', {"A member of the team will review your feedback as soon as possible.":"团队的成员将尽快查阅您的反馈意见。","About":"关于","Account Information":"账户信息","Account Name":"账户名","Account Settings":"账户设置","Account name":"账户名","Accounts":"帐户","Add Contact":"添加联系人","Add account":"添加帐户","Add as a contact":"添加到联系人","Add description":"添加描述","Address Book":"地址簿","Advanced":"進階","Advanced Settings":"进阶设置","Allow Camera Access":"允许访问相机","Allow notifications":"允许通知","Almost done! Let's review.":"就要完成了 ！让我们复查一遍。","Alternative Currency":"替代货币","Amount":"数额","Are you being watched?":"你正在被监视吗？","Are you sure you want to delete this contact?":"你确定你要删除此联系人？","Are you sure you want to delete this wallet?":"确定要删除这钱包？","Are you sure you want to skip it?":"你确定你想跳过它？","Backup Needed":"需要备份","Backup now":"现在备份","Backup wallet":"备份钱包","Be sure to store your seed in a secure place. If this app is deleted, or your device stolen, the seed is the only way to recreate the wallet.":"请务必确保您的种子放在安全位置。如果app被删，或是设备丢失，该种子是唯一可以让你重建钱包的方法。","Browser unsupported":"不受支持的浏览器","But do not lose your seed!":"不要丢失你的种子！","Buy &amp; Sell Bitcoin":"购买或出售比特币","Cancel":"取消","Cannot Create Wallet":"不能创建钱包","Choose a backup file from your computer":"从你的计算机选择一个备份文件","Click to send":"点击这里发送","Close":"关闭","Coin":"币种","Color":"颜色","Commit hash":"提交哈希","Confirm":"确定","Confirm &amp; Finish":"确认并完成","Contacts":"联系人","Continue":"继续","Contribute Translations":"参与翻译","Copied to clipboard":"已复制到剪贴板","Copy this text as it is to a safe place (notepad or email)":"将此文本复制到一个安全的地方（记事本或电子邮件）","Copy to clipboard":"复制到剪贴板","Could not access the wallet at the server. Please check:":"无法访问服务器上的钱包。请确认︰","Create Account":"创建账户","Create new account":"创建新账户","Creating Wallet...":"正在创建钱包...","Creating account...":"账户创建中","Creating transaction":"正在创建交易","Date":"日期","Default Account":"账户纠错","Delete":"删除","Delete Account":"删除账户","Delete Wallet":"删除钱包","Deleting Wallet...":"正在删除钱包...","Do it later":"以后再做","Donate to Bitcoin Black":"为Canoe捐款","Download":"下载","Edit":"编辑","Email":"电子邮件","Email Address":"电子邮件地址","Enable camera access in your device settings to get started.":"相机中启用访问您的设备设置入门。","Enable email notifications":"启用电子邮件通知","Enable push notifications":"启用推式通知","Enable the camera to get started.":"开启摄像头访问权限以使用扫描功能。","Enter amount":"输入金额","Enter wallet seed":"输入钱包种子","Enter your password":"请输入您的密码","Error":"错误","Error at confirm":"在确认错误","Error scanning funds:":"错误扫描资金︰","Error sweeping wallet:":"错误清扫钱包︰","Export wallet":"导出钱包","Extracting Wallet information...":"正在提取的钱包信息...","Failed to export":"导出失败","Family vacation funds":"家庭度假资金","Feedback could not be submitted. Please try again later.":"无法提交反馈。请稍后再试。","File/Text":"文件/文本","Filter setting":"筛选器设置","Finger Scan Failed":"指纹扫描失败","Finish":"完成","From":"来自","Funds found:":"找到资金","Funds transferred":"资金转移","Funds will be transferred to":"资金将会转移到","Get started":{"button":"开始使用"},"Get started by adding your first one.":"通过添加您的第一个开始。","Go Back":"返回\t#","Go back":"上一页","Got it":"收到！","Help & Support":"帮助与支持","Help and support information is available at the website.":"已在网站上提供帮助和支持","Hide Balance":"隐藏的平衡","Home":"主屏幕","How could we improve your experience?":"我们如何可以改善您的体验？","I don't like it":"我不喜欢","I have read, understood, and agree with the Terms of use.":"我已经阅读、 理解并同意本使用条款。","I like the app":"我喜欢这个应用程序","I think this app is terrible.":"这个应用程序是可怕。","I understand":"我知道了","I understand that my funds are held securely on this device, not by a company.":"我确认了解，我的资金是被安全的储存在我的本地设备上，而不是一个公司。","I've written it down":"我已经把它写下来","If this device is replaced or this app is deleted, your funds can not be recovered without a backup.":"如果更换设备或是app被删，在没有备份的情况下无法恢复","If you have additional feedback, please let us know by tapping the \"Send feedback\" option in the Settings tab.":"如果你有额外的反馈，请让我们知道通过点击设置选项卡中的\"发送反馈\"选项。","If you take a screenshot, your backup may be viewed by other apps. You can make a safe backup with physical paper and a pen.":"如果您截一张屏幕截图，您的备份可能会被其他应用程序浏览。您可以用实体纸和笔来安全地备份。","Import Wallet":"导入钱包","Import seed":"导入种子","Import wallet":"导入钱包","Importing Wallet...":"正在导入钱包...","In order to verify your wallet backup, please type your password.":"为了验证您的钱包的备份，请键入您的密码。","Incomplete":"不完整","Insufficient funds":"资金不足","Invalid":"无效","Is there anything we could do better?":"有什么我们可以做得更好吗？","It's important that you write your wallet seed down correctly. If something happens to your wallet, you'll need this seed to reconstruct it. Please review your seed and try again.":"记录下钱包种子非常重要。如果您的钱包里发生故障，您需要种子重建钱包。请重新检查您的种子再试一次。","Language":"语言","Learn more":"了解更多","Loading transaction info...":"正在加载交易信息...","Log options":"日志选项","Makes sense":"有道理","Matches:":"匹配：","Meh - it's alright":"咩-没关系","Memo":"便签","More Options":"更多的选择","Name":"名称","New account":"新账户","No Account available":"没有可用账户","No contacts yet":"然而没有联系人","No entries for this log level":"没有为此日志级别的的条目","No recent transactions":"没有最近的交易","No transactions yet":"没有交易记录","No wallet found":"发现没有钱包","No wallet selected":"没有选定的钱包","No wallets available to receive funds":"没有可用于接收资金的钱包","Not funds found":"没有资金发现","Not now":"不是现在","Note":"备注","Notifications":"通知","Notify me when transactions are confirmed":"交易确认完毕时通知我","Now is a good time to backup your wallet. If this device is lost, it is impossible to access your funds without a backup.":"现在是很好的时间进行备份你的钱包。如果此设备丢失，它是无法访问您没有备份的资金。","Now is a perfect time to assess your surroundings. Nearby windows? Hidden cameras? Shoulder-spies?":"现在是一个完美的时间来评估你的周围。附近的窗户吗？隐藏的摄像机？肩-间谍吗？","Numbers and letters like 904A2CE76...":"信息编号比如904A2CE76","OK":"好的","OKAY":"OKAY","Official English Disclaimer":"官方英文免责声明","Oh no!":"出错。","Open":"打开","Open GitHub":"打开 GitHub","Open GitHub Project":"打开 GitHub 项目","Open Settings":"打开设置","Open Website":"打开网站","Open website":"打开网站","Paste the backup plain text":"请复制备份文档","Payment Accepted":"已接受支付","Payment Proposal Created":"支付提议已创建","Payment Received":"收到付款","Payment Rejected":"支付被拒绝","Payment Sent":"支付已发送","Permanently delete this wallet.":"永久删除这个钱包。","Please carefully write down this 64 character seed. Click to copy to clipboard.":"请仔细写下64位的种子。并复制到剪贴板。","Please connect a camera to get started.":"请连接相机入门。","Please enter the seed":"请输入种子","Please, select your backup file":"请选择你的备份文件","Preferences":"偏好","Preparing addresses...":"正在准备地址...","Preparing backup...":"正在准备备份...","Press again to exit":"再按一次退出","Private Key":"私钥","Private key encrypted. Enter password":"私钥加密。输入密码","Push Notifications":"推式通知","QR Code":"QR 码","Quick review!":"快速审查 ！","Rate on the app store":"率的应用程序商店","Receive":"接收","Received":"已接收","Recent":"最近","Recent Transaction Card":"最近交易卡","Recent Transactions":"最近的交易","Recipient":"收件人","Release information":"发布信息","Remove":"移除","Restore from backup":"从备份中还原","Retry":"重试","Retry Camera":"重试摄像头","Save":"保存","Scan":"扫描","Scan QR Codes":"扫描二维码","Scan again":"重新扫描","Scan your fingerprint please":"请扫描您的指纹","Scanning Wallet funds...":"正在扫描钱包资金...","Screenshots are not secure":"截图是不安全的","Search Transactions":"搜索交易","Search or enter account number":"搜索或输入账户号","Search transactions":"搜索交易","Search your currency":"搜索您的货币","Select a backup file":"选择备份文件","Select an account":"选择一个账号","Send":"发送","Send Feedback":"发送反馈","Send by email":"通过电邮发送","Send from":"从发送","Send max amount":"发送最大数量","Send us feedback instead":"而是向我们发送反馈","Sending":"正在发送","Sending feedback...":"发送反馈信息...","Sending maximum amount":"发送的最大金额","Sending transaction":"正在发送交易","Sending {{amountStr}} from your {{name}} account":"从 {{name}} 账号发送{{amountStr}}","Sent":"已发送","Services":"服务","Session Log":"会话日志","Session log":"会话日志","Settings":"设置","Share the love by inviting your friends.":"邀请您的朋友分享爱。","Show Account":"显示账号","Show more":"显示更多","Signing transaction":"签名交易","Since only you control your money, you’ll need to save your wallet seed in case this app is deleted.":"因为您是唯一能控制您资金的人，所以请务必保管好您的钱包种子以防丢失。","Skip":"跳过","Slide to send":"滑动滑块以发送","Sweep":"扫描","Sweep paper wallet":"扫描纸钱包","Sweeping Wallet...":"正在扫描钱包","THIS ACTION CANNOT BE REVERSED":"此操作无法撤消","Tap and hold to show":"点击并按住以显示","Terms Of Use":"使用条件","Terms of Use":"使用条款","Text":"文本","Thank you!":"谢谢您！","Thanks!":"谢谢！","That's exciting to hear. We'd love to earn that fifth star from you – how could we improve your experience?":"这是令人兴奋的听到。我们愿意赚五明星从你 — — 我们如何可以改善您的体验吗？","The seed":"该种子","The seed is invalid, it should be 64 characters of: 0-9, A-F":"该种子无效，种子的长度应为64位字符：由数字0-9，字母A-F组成","The wallet server URL":"钱包的服务器地址","There is an error in the form":"表格中有错误","There's obviously something we're doing wrong.":"显然是我们正在做的事情错了。","This app is fantastic!":"这个应用程序太棒了 ！","Timeline":"时间轴","To":"发送到","Touch ID Failed":"指纹ID 识别失败","Transaction":"转账","Transfer to":"转账给","Transfer to Account":"转账给账户","Try again in {{expires}}":"在 {{expires}} 中再试一次","Uh oh...":"哦哦......","Update Available":"可用的更新","Updating... Please stand by":"更新中… 请等待","Verify your identity":"验证您的身份","Version":"版本","View":"查看","View Terms of Service":"查看服务条款","View Update":"查看更新","Wallet Accounts":"钱包账户","Wallet File":"钱包文件","Wallet Seed":"钱包种子","Wallet seed not available":"钱包种子不可用","Warning!":"警告！​​​​​","Watch out!":"小心 ！","We'd love to do better.":"我们很乐意做得更好。","Website":"网站","What do you call this account?":"您想管这个账户叫什么？","Would you like to receive push notifications about payments?":"你想收到推式通知有关付款吗？","Yes":"是","Yes, skip":"是的，跳过","You can change the name displayed on this device below.":"您可以在下面修改在该设备显示的名称。","You can create a backup later from your wallet settings.":"你可以从你的钱包设置以后创建备份。","You can see the latest developments and contribute to this open source app by visiting our project on GitHub.":"你可以看到最新的事态发展和贡献这个开放源码应用程序通过在 GitHub 上访问我们的项目。","You can still export it from Advanced &gt; Export.":"你仍然可以将其导出从高级 &gt; 出口。","You'll receive email notifications about payments sent and received from your wallets.":"在您的钱包进行付款操作时发送通知。","Your ideas, feedback, or comments":"你的想法、 反馈或评论","Your password":"你的密码","Your wallet is never saved to cloud storage or standard device backups.":"你的钱包是永远不会保存到云存储或标准设备备份。","[Balance Hidden]":"[隐藏余额]","I have read, understood, and agree to the <a ng-click=\"openTerms()\" href=\"javascript:void(0)\" translate=\"\">Terms of Use</a>.":"我已经阅读、 理解并同意本使用条款。","5-star ratings help us get Canoe into more hands, and more users means more resources can be committed to the app!":"给我们5星好评可以帮助Canoe获得更多用户的了解，有了更多的了解可以帮助我们获得更多的资源并丰富我们的功能。","At least 8 Characters. Make it good!":"请输入至少八位字符。谢谢！","Change Password":"修改密码","Confirm New Password":"确认新密码","How do you like Canoe?":"您觉得Canoe怎么样？","Let's Start":"我们开始吧","New Password":"新密码","Old Password":"旧密码","One more time.":"再次输入。","Password too short":"密码长度不够","Passwords don't match":"两次密码不匹配","Passwords match":"两次密码确认匹配","Push notifications for Canoe are currently disabled. Enable them in the Settings app.":"Canoe的推送通知被系统禁用。请前往设置以开启。","Share Canoe":"分享Canoe","There is a new version of Canoe available":"有新的Canoe版本可以下载。","We're always looking for ways to improve Canoe.":"我们一直在努力改进Canoe。","We're always looking for ways to improve Canoe. How could we improve your experience?":"我们一直在努力改进Canoe。能否请您提出宝贵的改进意见？","Would you be willing to rate Canoe in the app store?":"您能否帮忙在app store中为Canoe打分？","Account Alias":"账号别名","Account Color":"账号颜色","Alias":"别名","Backup seed":"备份钱包种子","Create Wallet":"创建钱包","Don't see your language? Sign up on POEditor! We'd love to support your language.":"没有看到你所用的语言？请注册poeditor!我们很乐意加入你所用的语言支持。","Edit Contact":"编辑联系人","Enter password":"输入密码","Incorrect password, try again.":"密码不正确，请重试。","Joe Doe":"乔欧","Join the future of money,<br>get started with BCB.":"货币的未来，<br>从Nano开始。","Lock wallet":"锁定Canoe","BCB is different – it cannot be safely held with a bank or web service.":"Nano是不同的 &ndash; 它不可以被银行或者网站保存。","No accounts available":"没有可用的账号","No backup, no BCB.":"无备份不Nano。","Open POEditor":"打开POEditor","Open Translation Site":"打开翻译网站","Password to decrypt":"请输入解密钱包的密码。","Password to encrypt":"请输入加密钱包的密码。","Please enter a password to use for the wallet":"请输入一个密码钱包所使用的密码","Repair":"修复","Send BCB":"发送Nano","Start sending BCB":"开始发送Nano","To get started, you need BCB. Share your account to receive BCB.":"首先，你首先需要Nano。出示你的账号来接受Nano。","To get started, you need an Account in your wallet to receive BCB.":"你需要先用一个钱包的账号来接受Nano。","Type below to see if an alias is free to use.":"输入到下面空白以确定该别名是否可用。","Use Server Side PoW":"使用服务器端工作量证明（PoW）","We’re always looking for translation contributions! You can make corrections or help to make this app available in your native language by joining our community on POEditor.":"我们希望有人能够帮忙翻译我们的钱包。你可以通过加入到我们poeditor的社区，帮忙校正或者将本钱包翻译到你的母语。","You can make contributions by signing up on our POEditor community translation project. We’re looking forward to hearing from you!":"你可以通过注册poeditor来参与翻译本项目。我们希望听到你们支持的声音！","You can scan BCB addresses, payment requests and more.":"您可以扫描Nano地址、申请支付还有其他。","Your Bitcoin Black Betanet Wallet is ready!":"您的Nano钱包已经就绪！","Your BCB wallet seed is backed up!":"您的Nano钱包种子已经备份！","Account":"账号","An account already exists with that name":"已经存在一个相同名字的账号","Confirm your PIN":"确认您的4位密码","Enter a descriptive name":"请输入一个描述性名字","Failed to generate seed QR code":"二维码生成失败","Incorrect PIN, try again.":"4位密码错误，请重试。","Incorrect code format for a seed:":"不正确的钱包种子格式：","Information":"信息","Not a seed QR code:":"不是一个包含钱包种子的二维码：","Please enter your PIN":"请输入您的4位密码","Scan this QR code to import seed into another application":"扫描QR码来将种子密码导入其他程序。","Security Preferences":"安全设置","Your current password":"您当前的密码","Your password has been changed":"您的密码已经修改成功","Canoe stores your BCB using cutting-edge security.":"Canoe钱包通过前沿的安全技术保存你的Nano。","Caution":"注意","Decrypting wallet...":"钱包正在解码...","Error after loading wallet:":"载入钱包后发生错误：","I understand that if this app is deleted, my wallet can only be recovered with the seed or a wallet file backup.":"我确认了解，如果本软件被删除，我的钱包只能够通过钱包种子（Seed）或钱包的备份文件来恢复。","Importing a wallet removes your current wallet and all its accounts. You may wish to first backup your current seed or make a file backup of the wallet.":"导入一个钱包，会删除您设备中现有的钱包以及钱包中的全部账户。您可能想要先备份您当前钱包的种子或制作一个该钱包的备份文件,再继续您的导入。","Incorrect code format for an account:":"不正确的账号地址格式：","Just scan and pay.":"只需扫描并支付。","Manage":"管理","BCB is Feeless":"Nano是无手续费的","BCB is Instant":"Nano是即时到账的","BCB is Secure":"Nano是安全的","Never pay transfer fees again!":"再也不需要支付手续费！","Support":"技术支持","Trade BCB for other currencies like USD or Euros.":"通过Nano和其他货币如美元或者欧元兑换。","Transfer BCB instantly to anyone, anywhere.":"将Nano转账给任何人，任何地方。","Account Representative":"投票代表账号","Add to address book?":"加入到地址通讯录？","Alias Found!":"找到该别名！","At least 3 Characters.":"至少需要3个字符。","Checking availablity":"查询可用性","Create Alias":"创建别名","Creating Alias...":"正在创建别名...","Do you want to add this new address to your address book?":"你是否希望添加这个新地址到您的地址通讯录中？","Edit your alias.":"编辑您的账号别名。","Editing Alias...":"正在编辑您的账号别名...","Email for recovering your alias":"用来恢复您别名的Email地址","Enter a representative account.":"输入一个投票代理账号。","Error importing wallet:":"倒入钱包出错：","How to buy BCB":"如何购买Nano","How to buy and sell BCB is described at the website.":"网站中会注明如何购买和卖出Nano。","Invalid Alias!":"无效的别名！","Invalid Email!":"无效的Email账号！","Let People Easily Find you With Aliases":"让其他用户可以很容易地通过别名来找到您","Link my wallet to my phone number.":"绑定我的手机号到我的钱包上。","Looking up @{{addressbookEntry.alias}}":"正在查询@{{addressbookEntry.alias}}","Make my alias private.":"不公开我的别名。","Refund":"退款","Repairing your wallet could take some time. This will reload all blockchains associated with your wallet. Are you sure you want to repair?":"修复钱包需要一些时间。这会重新加载和你钱包相关的区块。你确定修复钱包吗？","Representative":"投票代表","Representative changed":"投票代表已变更","That alias is taken!":"这个别名已被使用！","The official English Terms of Service are available on the Canoe website.":"正式的英文服务条款可以在Canoe的官方网页找到。","Valid Alias & Email":"验证别名和邮件地址","View Block on BCB Block Explorer":"在Nanode上查看该区块","View on BCB Block Explorer":"在Nanode上查看","What alias would you like to reserve?":"你希望保留什么别名？","You can change your alias, email, or privacy settings.":"你可以变更你的别名，邮件地址和隐私设置.","Your old password was not entered correctly":"您输入的旧密码不正确","joe.doe@example.com":"joe.doe@example.com","joedoe":"joedoe","Wallet is Locked":"Canoe已被锁上","Forgot Password?":"忘记密码？","4-digit PIN":"4位密码","Anyone with your seed can access or spend your BCB.":"任何人都可以通过种子密码访问和花费你的nano.","Background Behaviour":"后台行为","Change 4-digit PIN":"修改4位密码","Change Lock Settings":"变更锁定设置","Fingerprint":"指纹识别","Go back to onboarding.":"重置到初始模式。","Hard Lock":"硬锁定","Hard Timeout":"硬锁定超时","If enabled, Proof Of Work is delegated to the Canoe server side. This option is disabled and always true on mobile Canoe for now.":"如果启用，Canoe服务器负责转账需要计算工作（Proof Of Work）。当前这个选项不可选，计算工作暂时只能通过服务器端来执行。","If enabled, a list of recent transactions across all wallets will appear in the Home tab. Currently false, not fully implemented.":"如果启用，所有钱包的转账记录都会显示在主页。当前未启用，功能还未完全实现。","Lock when going to background":"在后台运行时锁定","None":"无","Password":"密码","Saved":"已保存","Soft Lock":"软锁定","Soft Lock Type":"软锁定类型","Soft Timeout":"软锁定超时","Timeout in seconds":"几秒后超时","Unrecognized data":"不可识别数据","<h5 class=\"toggle-label\" translate=\"\">Hard Lock</h5>\n          With Hard Lock, Canoe encrypts your wallet and completely remove it from memory. You can not disable Hard Lock, but you can set a very high timeout.":"<h5 class=\"toggle-label\" translate=\"\">硬锁定</h5>\n          硬锁定，Canoe会加密你的钱包并从内存里面删除。硬锁定不能被禁用，不过你可以设置一个比较长的等待锁定的时间。","A new version of this app is available. Please update to the latest version.":"有新版本发布。请更新到最新版本。","Backend URL":"后台地址链接","Change Backend":"改变后台","Change Backend Server":"改变后台服务器","Importing a wallet will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"导入一个新的钱包会删除你现有的钱包和所用账号！如果你有资金在当前钱包里面，请确保你有备份当前钱包。输入delete以确认你希望删除当前钱包。","Max":"全部","delete":"删除","bitcoin.black":"bitcoin.black","Confirm Password":"确认密码","Going back to onboarding will remove your existing wallet and accounts! If you have funds in your current wallet, make sure you have a backup to restore from. Type \"delete\" to confirm you wish to delete your current wallet.":"回到入口会删除你现有的钱包和所用账号！如果你有资金在当前钱包里面，请确保你有备份当前钱包。输入delete以确认你希望删除当前钱包。","Please enter a password of at least 8 characters":"请输入8位或以上的密码","On this screen you can see all your accounts. Check our <a ng-click=\"openExternalLinkHelp()\">FAQs</a> before you start!":"在这个页面上面你可以看到你所有的账号。在使用之前请先阅读我们的<a ng-click=\"openExternalLinkHelp()\">FAQs</a> ！","Play Sounds":"打开提示音","<h5 class=\"toggle-label\" translate=\"\">Background Behaviour</h5>\n            <p translate=\"\">Choose the lock type to use when Canoe goes to the background. To disable background locking select None.</p>":"<h5 class=\"toggle-label\" translate=\"\">后台行为</h5>\n            <p translate=\"\">选择当Canoe后台运行时的锁定类型，如果不想锁定请选择None。</p>","<h5 class=\"toggle-label\" translate=\"\">Soft Lock</h5>\n          <p translate=\"\">With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.</p>":"<h5 class=\"toggle-label\" translate=\"\">软锁定</h5>\n          <p translate=\"\">当软锁定的时候，Canoe钱包被锁定了，不过你的钱包在内存中未加密。软锁定的时候，你可以使用pin码或者指纹来解送。</p>","Choose the lock type to use when Canoe goes to the background. To disable background locking select None.":"选择当Canoe后台运行时的锁定类型，如果不想锁定请选择None。","Encryption Time!":"正在加密！","Enter at least 8 characters to encrypt your wallet.":"请输入至少8位的密码以加密您的钱包。","Password length ok":"合适的密码长度","Passwords do not match":"输入的密码不一致","Unlock":"解锁","With Soft Lock, Canoe is locked but your wallet is still live unencrypted in memory. Enabling Soft Locks, makes it possible to use simpler forms of credentials like PINs and fingerprints.":"通过软锁定功能，Canoe软件将被锁定但是您的钱包数据将仍然被以非加密形式储存于设备内存中。开启软锁定功能，可以用更简便的方式解锁钱包（如4位密码或指纹解锁等）。","Attributions":"属性","Block was scanned and sent successfully":"区块已被扫描且发送成功","Block was scanned but failed to process:":"区块已被扫描，但处理区块失败：","Failed connecting to backend":"连接到服务器失败","Failed connecting to backend, no network?":"连接到服务器失败，没有网络？","Successfully connected to backend":"成功联机到服务器","BCB Account":"Nano账号","Send BCB to this address":"发送Nano到这个地址"});
/* jshint +W100 */
}]);
window.version="1.0.2";
window.commitHash="00fecb6";
window.appConfig={"packageName":"bcb-online-wallet","packageDescription":"Bitcoin Black Betanet Wallet","packageNameId":"com.bcb-online-wallet.bitcoinblack","statusBarColor":"#192c3a","userVisibleName":"Bitcoin Black Betanet Wallet","purposeLine":"Bitcoin Black Betanet Wallet","bundleName":"bcbonlinewallet","appUri":"bcb-online-wallet","name":"bcb-online-wallet","nameNoSpace":"bcb-online-wallet","nameCase":"Bitcoin Black Betanet Wallet","nameCaseNoSpace":"Bitcoin Black Betanet Wallet","gitHubRepoName":"bcb-online-wallet","gitHubRepoUrl":"","gitHubRepoBugs":"","disclaimerUrl":"http://bitcoin.black/disclaimer","url":"http://bitcoin.black","appDescription":"Bitcoin Black Betanet Wallet","winAppName":"Bitcoin Black Betanet Wallet","WindowsStoreIdentityName":"---","WindowsStoreDisplayName":"Secure Bitcoin Black Betanet Online Wallet","windowsAppId":"---","pushSenderId":"---","description":"A Secure Bitcoin Black Betanet Wallet","version":"0.0.1","androidVersion":"391000","_extraCSS":null,"_enabledExtensions":{}};
'use strict'
/* global angular cordova */
angular.element(document).ready(function () {
  // Run canoeApp after device is ready.
  var startAngular = function () {
    angular.bootstrap(document, ['canoeApp'])
  }

  function handleOpenURL (url) {
    if ('cordova' in window) {
      console.log('DEEP LINK:' + url)
      cordova.fireDocumentEvent('handleopenurl', {
        url: url
      })
    } else {
      console.log('ERROR: Cannont handle open URL in non-cordova apps')
    }
  }

  /* Cordova specific Init */
  if ('cordova' in window) {
    window.handleOpenURL = handleOpenURL

    document.addEventListener('deviceready', function () {
      window.open = cordova.InAppBrowser.open

      // Create a sticky event for handling the app being opened via a custom URL
      cordova.addStickyDocumentEventHandler('handleopenurl')
      startAngular()
    }, false)
  } else {
    startAngular()
  }
})

!function(r){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=r();else if("function"==typeof define&&define.amd)define([],r);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).BezierEasing=r()}}(function(){return function f(u,i,a){function c(n,r){if(!i[n]){if(!u[n]){var e="function"==typeof require&&require;if(!r&&e)return e(n,!0);if(d)return d(n,!0);var t=new Error("Cannot find module '"+n+"'");throw t.code="MODULE_NOT_FOUND",t}var o=i[n]={exports:{}};u[n][0].call(o.exports,function(r){return c(u[n][1][r]||r)},o,o.exports,f,u,i,a)}return i[n].exports}for(var d="function"==typeof require&&require,r=0;r<a.length;r++)c(a[r]);return c}({1:[function(r,n,e){var a=4,c=1e-7,d=10,o="function"==typeof Float32Array;function t(r,n){return 1-3*n+3*r}function f(r,n){return 3*n-6*r}function u(r){return 3*r}function l(r,n,e){return((t(n,e)*r+f(n,e))*r+u(n))*r}function p(r,n,e){return 3*t(n,e)*r*r+2*f(n,e)*r+u(n)}function s(r){return r}n.exports=function(f,n,u,e){if(!(0<=f&&f<=1&&0<=u&&u<=1))throw new Error("bezier x values must be in [0, 1] range");if(f===n&&u===e)return s;for(var i=o?new Float32Array(11):new Array(11),r=0;r<11;++r)i[r]=l(.1*r,f,u);function t(r){for(var n=0,e=1;10!==e&&i[e]<=r;++e)n+=.1;var t=n+.1*((r-i[--e])/(i[e+1]-i[e])),o=p(t,f,u);return.001<=o?function(r,n,e,t){for(var o=0;o<a;++o){var f=p(n,e,t);if(0===f)return n;n-=(l(n,e,t)-r)/f}return n}(r,t,f,u):0===o?t:function(r,n,e,t,o){for(var f,u,i=0;0<(f=l(u=n+(e-n)/2,t,o)-r)?e=u:n=u,Math.abs(f)>c&&++i<d;);return u}(r,n,n+.1,f,u)}return function(r){return 0===r?0:1===r?1:l(t(r),n,e)}}},{}]},{},[1])(1)});
