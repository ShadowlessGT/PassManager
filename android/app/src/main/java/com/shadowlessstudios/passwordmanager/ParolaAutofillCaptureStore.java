package com.shadowlessstudios.passwordmanager;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Dedicated Android-autofill capture inbox. Secrets are never stored in plaintext
 * files, JS preferences, logs, cloud, nor synced to a different Android device.
 * In-app review after unlocking the Parola vault is still required.
 */
final class ParolaAutofillCaptureStore {
    private static final String PREFS = "parola_autofill_capture_v1";
    private static final String KEY_ALIAS = "parola_autofill_pending_aes_v1";
    private static final String PREFIX = "paf_";
    private static final String SUFFIX = ".sealed";
    private static final long MAX_AGE_MS = 7L * 24 * 3600 * 1000;
    private static final int MAX_PENDING = 20;

    private ParolaAutofillCaptureStore() {}

    static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("enabled",false);
    }

    static synchronized void setEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("enabled",enabled).apply();
        if (!enabled) clear(context);
    }

    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(KEY_ALIAS)) return ((KeyStore.SecretKeyEntry)store.getEntry(KEY_ALIAS,null)).getSecretKey();
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true).build());
        return generator.generateKey();
    }

    private static File[] files(Context context) {
        File[] files = context.getFilesDir().listFiles((dir,name) ->
                name.startsWith(PREFIX) && name.endsWith(SUFFIX));
        return files == null ? new File[0] : files;
    }

    private static File fileFor(Context context,String id) {
        if (id==null || !id.matches("[a-f0-9-]{36}")) throw new IllegalArgumentException("Ungültige Kennung.");
        return new File(context.getFilesDir(),PREFIX+id+SUFFIX);
    }

    private static JSONObject decode(File file) throws Exception {
        byte[] bytes;
        try(FileInputStream in = new FileInputStream(file)) {
            bytes = new byte[(int)Math.min(file.length(),32_000)];
            int pos=0, read;
            while(pos<bytes.length && (read=in.read(bytes,pos,bytes.length-pos))>0) pos+=read;
            if(pos!=bytes.length || bytes.length < 13 || file.length() > 32_000) throw new IllegalArgumentException("Ungültige Sicherung.");
        }
        int ivLength=bytes[0] & 0xff;
        if(ivLength!=12 || bytes.length<=1+ivLength+16) throw new IllegalArgumentException("Ungültige Sicherung.");
        byte[] iv=Arrays.copyOfRange(bytes,1,1+ivLength);
        byte[] encrypted=Arrays.copyOfRange(bytes,1+ivLength,bytes.length);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));
        return new JSONObject(new String(cipher.doFinal(encrypted),StandardCharsets.UTF_8));
    }

    private static void prune(Context context) {
        File[] all=files(context);
        long now=System.currentTimeMillis();
        List<File> valid=new ArrayList<>();
        for(File file:all) {
            if(file.length() > 32_000 || now-file.lastModified()>MAX_AGE_MS || file.lastModified()>now+60_000) {
                file.delete(); continue;
            }
            valid.add(file);
        }
        valid.sort((a,b)->Long.compare(b.lastModified(),a.lastModified()));
        for(int i=MAX_PENDING;i<valid.size();i++) valid.get(i).delete();
    }

    static synchronized void save(Context context, String appPackage,String webDomain,String username,String password) throws Exception {
        if(!isEnabled(context) || appPackage == null || appPackage.equals(context.getPackageName())
                || !appPackage.matches("[a-zA-Z0-9_.]{3,190}")
                || password==null || password.isEmpty() || password.length()>4096) return;
        String user=username==null ? "" : username.trim();
        if(user.length()>320) user=user.substring(0,320);
        String domain=webDomain==null ? "" : webDomain;
        if(domain.length()>250) domain=domain.substring(0,250);
        // Hostname is unverified metadata, never an authorization to overwrite a vault entry.
        JSONObject candidate=new JSONObject();
        candidate.put("id",UUID.randomUUID().toString());
        candidate.put("appPackage",appPackage);
        candidate.put("webDomain",domain);
        candidate.put("username",user);
        candidate.put("password",password);
        candidate.put("capturedAt",System.currentTimeMillis());

        prune(context);
        for (File file:files(context)) {
            try {
                JSONObject existing=decode(file);
                if(appPackage.equals(existing.optString("appPackage"))
                        && user.equals(existing.optString("username"))
                        && domain.equals(existing.optString("webDomain"))
                        && password.equals(existing.optString("password"))) return;
            } catch(Exception invalid) { file.delete(); }
        }

        byte[] clear=candidate.toString().getBytes(StandardCharsets.UTF_8);
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE,key());
        byte[] iv=cipher.getIV();
        byte[] sealed=cipher.doFinal(clear);
        byte[] output=new byte[1+iv.length+sealed.length];
        output[0]=(byte)iv.length;
        System.arraycopy(iv,0,output,1,iv.length);
        System.arraycopy(sealed,0,output,1+iv.length,sealed.length);
        File target=fileFor(context,candidate.getString("id"));
        File temp=new File(context.getFilesDir(),PREFIX+candidate.getString("id")+".tmp");
        try(FileOutputStream out = new FileOutputStream(temp)) {
            out.write(output);
            out.getFD().sync();
        }
        if(!temp.renameTo(target)) {temp.delete();throw new IllegalStateException("Speichern fehlgeschlagen.");}
        prune(context);
        Arrays.fill(clear,(byte)0);
    }

    static synchronized JSONArray list(Context context) {
        prune(context);
        JSONArray result=new JSONArray();
        for(File file:files(context)) {
            try {
                JSONObject item=decode(file);
                JSONObject metadata=new JSONObject();
                metadata.put("id",item.getString("id"));
                metadata.put("appPackage",item.optString("appPackage"));
                metadata.put("webDomain",item.optString("webDomain"));
                metadata.put("username",item.optString("username"));
                metadata.put("capturedAt",item.optLong("capturedAt"));
                result.put(metadata);
            } catch(Exception corrupt) { file.delete(); }
        }
        return result;
    }

    static synchronized JSONObject read(Context context,String id) throws Exception {
        File file=fileFor(context,id);
        if(!file.exists()) throw new IllegalArgumentException("Eintrag nicht vorhanden.");
        JSONObject item=decode(file);
        if(!id.equals(item.optString("id"))) throw new SecurityException("Ungültige Kennung.");
        return item;
    }

    static synchronized void delete(Context context,String id) {
        File file=fileFor(context,id);
        if(file.exists() && !file.delete()) throw new IllegalStateException("Eintrag konnte nicht gelöscht werden.");
    }

    static synchronized void clear(Context context) {
        for(File file:files(context)) file.delete();
        File[] temps=context.getFilesDir().listFiles((dir,name)->name.startsWith(PREFIX)&&name.endsWith(".tmp"));
        if(temps!=null)for(File temp:temps) temp.delete();
    }
}
