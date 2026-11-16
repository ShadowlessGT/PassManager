package com.shadowlessstudios.passwordmanager;

import android.app.assist.AssistStructure;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.FillCallback;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveInfo;
import android.service.autofill.SaveRequest;
import android.text.InputType;
import android.view.View;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;

import java.util.List;
import java.util.Locale;

/** Save-only Android AutofillService. Never supplies passwords to other apps.
 * Android displays its own consent sheet; only afterwards onSaveRequest runs.
 */
public class ParolaAutofillCaptureService extends AutofillService {
    private static final int LIMIT_NODES = 2500;

    private static final class Fields {
        AutofillId passwordId, usernameId;
        String password="",username="",webDomain="";
        int visited=0;
    }

    private static int classify(AssistStructure.ViewNode node) {
        StringBuilder text=new StringBuilder();
        String[] hints=node.getAutofillHints();
        if(hints!=null)for(String hint:hints)if(hint!=null)text.append(' ').append(hint);
        if(node.getIdEntry()!=null)text.append(' ').append(node.getIdEntry());
        if(node.getHint()!=null)text.append(' ').append(node.getHint());
        if(node.getHtmlInfo()!=null && node.getHtmlInfo().getAttributes()!=null)
            for(android.util.Pair<String,String> pair:node.getHtmlInfo().getAttributes()){
                if(pair!=null && ("autocomplete".equalsIgnoreCase(pair.first) || "type".equalsIgnoreCase(pair.first)
                        || "name".equalsIgnoreCase(pair.first)) && pair.second!=null)
                    text.append(' ').append(pair.second);
            }
        String value=text.toString().toLowerCase(Locale.ROOT);
        if(value.matches(".*(otp|one.time|one-time|cvc|cvv|card|credit|pin|tan|verification.code|2fa).*")) return 0;
        int input=node.getInputType() & InputType.TYPE_MASK_VARIATION;
        int inputClass=node.getInputType() & InputType.TYPE_MASK_CLASS;
        if(inputClass==InputType.TYPE_CLASS_NUMBER) return 0;
        if(value.matches(".*(newpassword|new.password|current.password|password|passwort|kennwort|pwd|passcode).*")
                || (inputClass==InputType.TYPE_CLASS_TEXT &&
                (input==InputType.TYPE_TEXT_VARIATION_PASSWORD || input==InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                    || input==InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD))) return 2;
        if(value.matches(".*(username|user.name|benutzername|email|e.mail|login|account|userid).*")
                || (inputClass==InputType.TYPE_CLASS_TEXT &&
                (input==InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS || input==InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS))) return 1;
        return 0;
    }

    private static void walk(AssistStructure.ViewNode node,Fields fields,boolean readValues) {
        if(node==null || ++fields.visited>LIMIT_NODES)return;
        if(fields.webDomain.isEmpty() && node.getWebDomain()!=null)fields.webDomain=node.getWebDomain();
        int kind=classify(node);
        if(kind==2 && fields.passwordId==null) {
            fields.passwordId=node.getAutofillId();
            if(readValues)fields.password=textValue(node);
        }else if(kind==1 && fields.usernameId==null){
            fields.usernameId=node.getAutofillId();
            if(readValues)fields.username=textValue(node);
        }
        for(int i=0;i<node.getChildCount() && fields.visited<LIMIT_NODES;i++)
            walk(node.getChildAt(i),fields,readValues);
    }

    private static String textValue(AssistStructure.ViewNode node) {
        // getText() can be stale when Android assembles SaveRequest.
        AutofillValue val=node.getAutofillValue();
        return val!=null && val.isText() ? val.getTextValue().toString() : "";
    }

    private static Fields extract(AssistStructure structure,boolean readValues) {
        Fields fields=new Fields();
        for(int i=0;i<structure.getWindowNodeCount()&&fields.visited<LIMIT_NODES;i++)
            walk(structure.getWindowNodeAt(i).getRootViewNode(),fields,readValues);
        return fields;
    }

    private String app(AssistStructure structure) {
        return structure.getActivityComponent()==null ? "" :
                structure.getActivityComponent().getPackageName();
    }

    @Override public void onFillRequest(FillRequest request,CancellationSignal cancellation,FillCallback callback) {
        try {
            if(cancellation.isCanceled() || !ParolaAutofillCaptureStore.isEnabled(this)
                    || request.getFillContexts().isEmpty()) {callback.onSuccess(null);return;}
            AssistStructure structure=request.getFillContexts().get(request.getFillContexts().size()-1).getStructure();
            if(getPackageName().equals(app(structure))) {callback.onSuccess(null);return;}
            Fields fields=extract(structure,false);
            if(fields.passwordId==null){callback.onSuccess(null);return;}
            SaveInfo.Builder builder=new SaveInfo.Builder(SaveInfo.SAVE_DATA_TYPE_USERNAME | SaveInfo.SAVE_DATA_TYPE_PASSWORD,
                    new AutofillId[]{fields.passwordId});
            if(fields.usernameId!=null)builder.setOptionalIds(new AutofillId[]{fields.usernameId});
            builder.setDescription("In Parola speichern – danach im entsperrten Tresor bestätigen");
            callback.onSuccess(new FillResponse.Builder().setSaveInfo(builder.build()).build());
        }catch(Exception ignored){callback.onSuccess(null);}
    }

    @Override public void onSaveRequest(SaveRequest request,SaveCallback callback) {
        try {
            if(!ParolaAutofillCaptureStore.isEnabled(this) || request.getFillContexts().isEmpty()){
                callback.onSuccess();return;
            }
            AssistStructure structure=request.getFillContexts().get(request.getFillContexts().size()-1).getStructure();
            String source=app(structure);
            if(!source.isEmpty() && !source.equals(getPackageName())){
                Fields fields=extract(structure,true);
                if(fields.passwordId!=null && !fields.password.isEmpty()){
                    ParolaAutofillCaptureStore.save(this,source,fields.webDomain,fields.username,fields.password);
                }
            }
            callback.onSuccess();
        }catch(Exception ignored) {
            // No credential values in logs or exceptions exposed to client apps.
            callback.onFailure("Speichern in Parola nicht möglich.");
        }
    }
}
